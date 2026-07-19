// =============================================================================
// patient.types.ts — PatientData Zod Schema & TypeScript Types
// =============================================================================
// Zod is used as the single source of truth:
//   • Runtime validation (parse() throws on bad data)
//   • Static TypeScript types via z.infer<> (no duplication)
//
// PatientDataSchema is intentionally strict — healthcare data demands it.
// All fields map 1:1 to FHIR R4 Patient resource fields.
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// PatientData — the structured output of the LLM extraction step
// ---------------------------------------------------------------------------
export const PatientDataSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be under 100 characters'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be under 100 characters'),

  // ISO 8601 date — FHIR R4 birthDate field format
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),

  // FHIR R4 AdministrativeGender value set
  gender: z.enum(['male', 'female', 'other', 'unknown'], {
    errorMap: () => ({
      message: "Gender must be one of: 'male', 'female', 'other', 'unknown'",
    }),
  }),

  // Chief complaint / reason for visit — maps to FHIR extension
  reason: z
    .string()
    .min(1, 'Reason for visit is required')
    .max(1000, 'Reason must be under 1000 characters'),
});

export type PatientData = z.infer<typeof PatientDataSchema>;

// ---------------------------------------------------------------------------
// IntakeRequest — the raw body that POST /api/process-intake accepts
// ---------------------------------------------------------------------------
export const IntakeRequestSchema = z.object({
  rawText: z
    .string()
    .min(10, 'Raw text must be at least 10 characters to extract meaningful data'),
});

export type IntakeRequest = z.infer<typeof IntakeRequestSchema>;
