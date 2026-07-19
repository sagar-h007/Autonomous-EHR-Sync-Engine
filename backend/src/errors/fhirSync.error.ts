// =============================================================================
// fhirSync.error.ts — Custom FHIR Synchronisation Error
// =============================================================================
// Throwing a typed error (rather than a generic Error or string) lets the
// orchestrator route handler catch *only* FHIR-specific failures and trigger
// the Playwright fallback, while letting other unexpected errors bubble up
// to the global error handler unchanged.
// =============================================================================

export class FHIRSyncError extends Error {
  /** The underlying axios error, network error, or response object */
  public readonly cause: unknown;

  /** HTTP status code from the FHIR server, if available */
  public readonly httpStatusCode?: number;

  constructor(message: string, cause: unknown, httpStatusCode?: number) {
    super(message);
    this.name = 'FHIRSyncError';
    this.cause = cause;
    this.httpStatusCode = httpStatusCode;
    // Maintains proper prototype chain in compiled JS (important for instanceof checks)
    Object.setPrototypeOf(this, FHIRSyncError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
