// =============================================================================
// fhir.service.ts — FHIR R4 Patient Resource Mapper & HAPI Push
// =============================================================================
// Two responsibilities:
//   1. buildFHIRPatientResource() — maps PatientData → FHIR R4 Patient JSON
//   2. pushToFHIR()               — POSTs the resource to the public HAPI FHIR
//                                   test server with robust error handling
//
// FHIR R4 Patient spec: https://www.hl7.org/fhir/R4/patient.html
// HAPI FHIR test server: http://hapi.fhir.org/baseR4
// =============================================================================

import axios, { AxiosError } from 'axios';
import { PatientData } from '../types/patient.types';
import { FHIRSyncError } from '../errors/fhirSync.error';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const HAPI_FHIR_BASE_URL = process.env['HAPI_FHIR_URL'] ?? 'http://hapi.fhir.org/baseR4';
const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds — HAPI can be slow under load

// ---------------------------------------------------------------------------
// FHIR R4 Patient resource shape (minimal — extend as requirements grow)
// ---------------------------------------------------------------------------
interface FHIRPatientResource {
  resourceType: 'Patient';
  name: Array<{
    use: string;
    family: string;
    given: string[];
  }>;
  birthDate: string;
  gender: string;
  extension: Array<{
    url: string;
    valueString: string;
  }>;
}

// ---------------------------------------------------------------------------
// HAPI FHIR POST response (minimal fields we care about)
// ---------------------------------------------------------------------------
interface FHIRCreateResponse {
  id: string;
  resourceType: string;
}

// ---------------------------------------------------------------------------
// buildFHIRPatientResource
// ---------------------------------------------------------------------------
/**
 * Maps a validated PatientData object to a FHIR R4-conformant Patient resource.
 * The `intake-reason` extension uses a local profile URL since this is a demo —
 * in production you'd register a StructureDefinition with your FHIR server.
 */
export function buildFHIRPatientResource(patient: PatientData): FHIRPatientResource {
  return {
    resourceType: 'Patient',
    name: [
      {
        use:    'official',
        family: patient.lastName,
        given:  [patient.firstName],
      },
    ],
    birthDate: patient.dateOfBirth,  // FHIR expects YYYY-MM-DD
    gender:    patient.gender,        // FHIR AdministrativeGender: male|female|other|unknown
    extension: [
      {
        url:         'http://ehr-sync-engine.local/StructureDefinition/intake-reason',
        valueString: patient.reason,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// pushToFHIR
// ---------------------------------------------------------------------------
/**
 * Pushes a FHIR R4 Patient resource to the public HAPI FHIR test server.
 *
 * @returns  The FHIR resource ID assigned by the server (e.g. "12345")
 * @throws   FHIRSyncError — on timeout, HTTP 4xx/5xx, or missing response ID
 */
export async function pushToFHIR(patient: PatientData): Promise<string> {
  const fhirPayload = buildFHIRPatientResource(patient);

  console.log('[FHIR] Pushing Patient resource to HAPI FHIR R4 server…');
  console.log('[FHIR] Endpoint:', `${HAPI_FHIR_BASE_URL}/Patient`);

  try {
    const response = await axios.post<FHIRCreateResponse>(
      `${HAPI_FHIR_BASE_URL}/Patient`,
      fhirPayload,
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept':        'application/fhir+json',
        },
        // Only 2xx counts as success — axios validates status automatically
        validateStatus: (status) => status >= 200 && status < 300,
      },
    );

    const fhirId = response.data?.id;

    if (!fhirId) {
      throw new FHIRSyncError(
        'HAPI FHIR server returned HTTP 2xx but the response body contained no resource ID.',
        response.data,
      );
    }

    console.log(`[FHIR] ✅ Patient created. FHIR ID: ${fhirId}`);
    return fhirId;

  } catch (err: unknown) {
    // Re-throw FHIRSyncError we constructed above — don't double-wrap it
    if (err instanceof FHIRSyncError) throw err;

    const axiosErr = err as AxiosError;

    // ── Timeout ─────────────────────────────────────────────────────────────
    if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
      throw new FHIRSyncError(
        `HAPI FHIR request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`,
        err,
      );
    }

    // ── HTTP error response (4xx / 5xx) ─────────────────────────────────────
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      throw new FHIRSyncError(
        `HAPI FHIR server responded with HTTP ${status}: ${JSON.stringify(axiosErr.response.data)}`,
        err,
        status,
      );
    }

    // ── Network / DNS / connection refused ───────────────────────────────────
    throw new FHIRSyncError(
      `Network error reaching HAPI FHIR server: ${axiosErr.message ?? 'Unknown network error'}`,
      err,
    );
  }
}
