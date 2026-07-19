// =============================================================================
// api.types.ts — Shared API Response Envelope Types
// =============================================================================
// All endpoints return ApiResponse<T> so client-side parsing is uniform.
// Using a discriminated union shape (success: true/false) lets TypeScript
// narrow the type — callers can check `if (res.success)` and get full
// inference on `res.data` vs `res.error`.
// =============================================================================

// ---------------------------------------------------------------------------
// Generic API response envelope
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;     // only emitted in development mode
  };
}

// ---------------------------------------------------------------------------
// IntakeResult — payload inside ApiResponse<IntakeResult>
// ---------------------------------------------------------------------------
export interface IntakeResult {
  /** UUID of the IntakeLog record created in the database */
  logId: string;

  /** Terminal sync outcome */
  status: 'SUCCESS_API' | 'SUCCESS_FALLBACK' | 'FAILED';

  /** Extracted patient demographics */
  patientData: Record<string, unknown>;

  /** FHIR resource ID — only present on SUCCESS_API */
  fhirId?: string;

  /** Human-readable summary of what happened */
  message: string;
}
