// =============================================================================
// app.ts — Express Application Factory
// =============================================================================
// Separating the Express `app` from the HTTP server (server.ts) allows this
// module to be imported in integration tests without binding to a port.
//
// Middleware stack (in registration order — order matters in Express):
//   1. helmet  — secure HTTP headers (XSS, MIME sniffing, clickjacking)
//   2. cors    — cross-origin resource sharing
//   3. morgan  — HTTP request logger
//   4. json    — body parser (50kb limit for FHIR payloads)
//   5. health  — GET /health (no DB dependency)
//   6. routes  — API route handlers
//   7. 404     — catch-all for unmapped paths
//   8. error   — centralised error handler (must be LAST)
// =============================================================================

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, AppError } from './middleware/errorHandler';
import intakeRouter from './routes/intake';
import logsRouter from './routes/logs';

const app: Application = express();

// ---------------------------------------------------------------------------
// 1. Security headers
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// 2. CORS — open in dev, restricted in production
// ---------------------------------------------------------------------------
const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') ?? ['*'];
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------------------------------------------------------------------------
// 3. Request logging
// ---------------------------------------------------------------------------
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// 4. Body parsing — 50kb accommodates FHIR payloads with base64 attachments
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '50kb' }));

// ---------------------------------------------------------------------------
// 5. Health check — responds immediately without DB hit
//    Used by load balancers and Docker HEALTHCHECK directives
// ---------------------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status:    'ok',
    service:   'ehr-sync-engine',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// 6. API routes
// ---------------------------------------------------------------------------
app.use('/api/process-intake', intakeRouter);
app.use('/api/intake-logs',    logsRouter);

// ---------------------------------------------------------------------------
// 7. 404 — any path not matched above
// ---------------------------------------------------------------------------
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource does not exist.'));
});

// ---------------------------------------------------------------------------
// 8. Global error handler — MUST be last
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
