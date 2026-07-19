// =============================================================================
// intake.ts — POST /api/process-intake Route Handler
// =============================================================================
// This is the orchestration layer — it wires together all services in the
// correct sequence and handles each failure mode explicitly:
//
//   1. Validate incoming request (Zod)
//   2. Extract PatientData via mock LLM
//   3. Attempt FHIR R4 push → SUCCESS_API
//   4. On FHIRSyncError → trigger Playwright fallback → SUCCESS_FALLBACK
//   5. On fallback failure → FAILED
//   6. Log result to PostgreSQL via Prisma
//   7. Return ApiResponse<IntakeResult>
//
// Query parameters:
//   ?simulateFhirFailure=true  — forces FHIR failure to demo the fallback path
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { IntakeRequestSchema } from '../types/patient.types';
import { extractPatientData } from '../services/llm.service';
import { pushToFHIR } from '../services/fhir.service';
import { runPlaywrightFallback } from '../services/automation.service';
import { FHIRSyncError } from '../errors/fhirSync.error';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import type { ApiResponse, IntakeResult } from '../types/api.types';

const router = Router();

// ---------------------------------------------------------------------------
// Terminal status → user-facing message map
// ---------------------------------------------------------------------------
const STATUS_MESSAGES: Record<'SUCCESS_API' | 'SUCCESS_FALLBACK' | 'FAILED', string> = {
  SUCCESS_API:
    '✅ Patient data successfully synced via FHIR R4 API. Resource created on HAPI FHIR server.',
  SUCCESS_FALLBACK:
    '⚠️  FHIR API was unavailable. Patient data synced via legacy UI automation fallback.',
  FAILED:
    '❌ All sync methods failed (FHIR API + UI automation). Manual data entry required.',
};

// ---------------------------------------------------------------------------
// POST /api/process-intake
// ---------------------------------------------------------------------------
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    // ── Parse ?simulateFhirFailure query param ───────────────────────────────
    const simulateFhirFailure = req.query['simulateFhirFailure'] === 'true';
    if (simulateFhirFailure) {
      console.log('[Intake] ⚡ FHIR failure simulation enabled via query param.');
    }

    // ── Step 1: Validate request body ────────────────────────────────────────
    let rawText: string;
    try {
      ({ rawText } = IntakeRequestSchema.parse(req.body));
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new AppError(
            400,
            'VALIDATION_ERROR',
            err.errors[0]?.message ?? 'Invalid request body',
          ),
        );
        return;
      }
      next(err);
      return;
    }

    // ── Step 2: LLM extraction ────────────────────────────────────────────────
    // extractPatientData is synchronous — it throws ZodError on bad mock data
    const patientData = extractPatientData(rawText);

    // ── Step 3: Attempt FHIR push ────────────────────────────────────────────
    let status: 'SUCCESS_API' | 'SUCCESS_FALLBACK' | 'FAILED' = 'FAILED';
    let fhirId: string | undefined;
    let errorDetail: string | undefined;

    try {
      if (simulateFhirFailure) {
        // Deliberately throw FHIRSyncError to exercise the fallback path
        throw new FHIRSyncError(
          'FHIR failure deliberately simulated via ?simulateFhirFailure=true query parameter.',
          null,
        );
      }

      fhirId = await pushToFHIR(patientData);
      status = 'SUCCESS_API';

    } catch (fhirErr: unknown) {

      // ── Step 4: Playwright fallback (only for FHIR-specific errors) ──────
      if (fhirErr instanceof FHIRSyncError) {
        console.warn(
          `[Intake] FHIR push failed: "${fhirErr.message}". Triggering Playwright fallback…`,
        );
        errorDetail = `FHIR error: ${fhirErr.message}`;

        try {
          await runPlaywrightFallback(patientData);
          status = 'SUCCESS_FALLBACK';
          errorDetail = undefined; // Clear — we recovered successfully

        } catch (automationErr: unknown) {
          status = 'FAILED';
          const automationMsg =
            automationErr instanceof Error ? automationErr.message : String(automationErr);
          errorDetail = `FHIR failed: ${fhirErr.message} | Automation also failed: ${automationMsg}`;
          console.error('[Intake] ❌ Both FHIR and Playwright fallback failed:', errorDetail);
        }

      } else {
        // Non-FHIR error (e.g., unexpected runtime error) — let it bubble up
        // to the global error handler rather than swallowing it silently
        next(fhirErr);
        return;
      }
    }

    // ── Step 5: Persist to database ──────────────────────────────────────────
    let log;
    try {
      log = await prisma.intakeLog.create({
        data: {
          rawText,
          patientData: patientData as unknown as Prisma.InputJsonValue,
          fhirId:      fhirId ?? null,
          status,
          errorDetail: errorDetail ?? null,
        },
      });
    } catch (dbErr: unknown) {
      // DB failure should not mask the sync result — log and continue
      console.error('[Intake] ⚠️  Failed to persist IntakeLog to database:', dbErr);
      // Assign a placeholder ID so the response can still be returned
      log = { id: 'db-error-no-log-id' };
    }

    // ── Step 6: Respond ──────────────────────────────────────────────────────
    const httpStatus = status === 'FAILED' ? 500 : 200;

    const body: ApiResponse<IntakeResult> = {
      success: status !== 'FAILED',
      data: {
        logId:       log.id,
        status,
        patientData: patientData as unknown as Record<string, unknown>,
        fhirId,
        message:     STATUS_MESSAGES[status],
      },
    };

    res.status(httpStatus).json(body);
  },
);

export default router;
