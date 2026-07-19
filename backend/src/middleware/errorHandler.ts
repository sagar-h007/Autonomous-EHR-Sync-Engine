// =============================================================================
// errorHandler.ts — Centralised Express Error Middleware
// =============================================================================
// Express identifies a 4-argument function as an error handler.
// All thrown errors and next(err) calls funnel here giving us one place to:
//   • Sanitise stack traces (never leak them to clients in production)
//   • Normalise error shapes to our ApiResponse<never> envelope
//   • Handle well-known Prisma error codes
// =============================================================================

import { ErrorRequestHandler } from 'express';
import type { ApiResponse } from '../types/api.types';

// ---------------------------------------------------------------------------
// AppError — throw this from route handlers for known, intentional errors.
// The statusCode lets the handler map directly to the HTTP response code.
// ---------------------------------------------------------------------------
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Prisma error shape — minimal type for the fields we inspect
// ---------------------------------------------------------------------------
interface PrismaError {
  code?: string;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Global error handler — MUST be registered last in the Express chain
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // ── Known application error ──────────────────────────────────────────────
  if (err instanceof AppError) {
    const body: ApiResponse<never> = {
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(isDev && { stack: err.stack }),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // ── Prisma unique constraint violation ───────────────────────────────────
  // P2002 = UNIQUE violation; surface as 409 Conflict rather than 500
  const prismaErr = err as PrismaError;
  if (prismaErr?.code === 'P2002') {
    const body: ApiResponse<never> = {
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists.' },
    };
    res.status(409).json(body);
    return;
  }

  // ── Unexpected error ─────────────────────────────────────────────────────
  console.error('[EHR Sync] Unhandled error:', err);

  const body: ApiResponse<never> = {
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      ...(isDev && { stack: (err as Error)?.stack }),
    },
  };
  res.status(500).json(body);
};
