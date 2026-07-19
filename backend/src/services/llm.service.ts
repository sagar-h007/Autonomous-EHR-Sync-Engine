// =============================================================================
// llm.service.ts — Mock LLM Patient Data Extraction Service
// =============================================================================
// In production this function would:
//   1. Send `rawText` to an LLM (OpenAI GPT-4o, Google Gemini, etc.) with a
//      structured-output prompt requesting a JSON object matching PatientData
//   2. Parse the raw model response (handling markdown code fences, etc.)
//   3. Validate the parsed object through PatientDataSchema.parse()
//
// For now we return a hardcoded patient record so the full orchestration
// pipeline can run end-to-end without any API keys or external calls.
//
// IMPORTANT: PatientDataSchema.parse() is still called on the mock data.
// This means any schema breaking change will surface here immediately —
// the mock doubles as a living schema conformance test.
// =============================================================================

import { PatientData, PatientDataSchema } from '../types/patient.types';

/**
 * Extracts structured PatientData from unstructured intake text.
 *
 * @param rawText - Free-form text from the intake form (e.g. nurse notes,
 *                  physician dictation, patient self-report)
 * @returns       Validated PatientData object
 * @throws        ZodError if the extracted data fails schema validation
 */
export function extractPatientData(rawText: string): PatientData {
  console.log(
    `[LLM] Extracting patient data from ${rawText.length} characters of raw text (mock mode)…`,
  );

  // ── Simulated LLM JSON output ─────────────────────────────────────────────
  // Replace this object with the actual LLM API call in Phase 2 production work.
  const mockLlmOutput = {
    firstName:   'John',
    lastName:    'Doe',
    dateOfBirth: '1985-03-15',
    gender:      'male',
    reason:
      'Patient presenting with persistent chest pain radiating to the left arm and shortness of breath on exertion. History of hypertension.',
  };

  // Always parse through Zod — even hardcoded mock data must conform to schema.
  // parse() throws ZodError synchronously if anything is wrong.
  const validated = PatientDataSchema.parse(mockLlmOutput);

  console.log('[LLM] ✅ Extraction complete:', {
    name: `${validated.firstName} ${validated.lastName}`,
    dob:  validated.dateOfBirth,
    gender: validated.gender,
  });

  return validated;
}
