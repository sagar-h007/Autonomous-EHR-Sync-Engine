// =============================================================================
// server.ts — EHR Sync Engine API Entry Point
// =============================================================================
// Responsibilities:
//   • Load .env before any other module reads process.env
//   • Verify DB connectivity before serving traffic (fail-fast)
//   • Bind the Express app to an HTTP port
//   • Handle graceful shutdown on SIGTERM / SIGINT
//   • Install global safety nets for unhandled rejections
// =============================================================================

import 'dotenv/config';   // Must be first — loads .env before any import reads env vars
import http from 'http';
import app from './app';
import prisma from './prisma';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

// ---------------------------------------------------------------------------
// Bootstrap sequence
// ---------------------------------------------------------------------------
async function bootstrap(): Promise<void> {

  // ── 1. Database connectivity check ────────────────────────────────────────
  // Failing here prevents the server from appearing "healthy" when the DB is
  // unreachable, which would cause confusing 500 errors on every request.
  try {
    await prisma.$connect();
    console.log('✅  Database connected');
  } catch (err) {
    console.error('❌  Failed to connect to database:', err);
    console.error('');
    console.error('    Is PostgreSQL running?');
    console.error('    → docker-compose up -d   (uses port 5433)');
    console.error('    → Check DATABASE_URL in backend/.env');
    process.exit(1);
  }

  // ── 2. Run pending Prisma migrations automatically in development ─────────
  // In production, migrations should be run as a CI/CD step, not at boot.

  // ── 3. Start HTTP server ──────────────────────────────────────────────────
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║         🏥  EHR Sync Engine — Running                ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`🚀  API:         http://localhost:${PORT}`);
    console.log(`❤️   Health:      http://localhost:${PORT}/health`);
    console.log(`📡  Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
    console.log('');
    console.log('Demo endpoints:');
    console.log(`  POST http://localhost:${PORT}/api/process-intake`);
    console.log(`  POST http://localhost:${PORT}/api/process-intake?simulateFhirFailure=true`);
    console.log('');
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️   Received ${signal}. Shutting down gracefully…`);

    server.close(async () => {
      console.log('🔌  HTTP server closed. Disconnecting Prisma…');
      await prisma.$disconnect();
      console.log('✅  Prisma disconnected. Goodbye!');
      process.exit(0);
    });

    // Force-exit if drain takes more than 10 seconds
    setTimeout(() => {
      console.error('⏰  Graceful shutdown timed out — forcing exit.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

// ---------------------------------------------------------------------------
// Global safety nets
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  console.error('🔥  Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('🔥  Uncaught Exception:', err);
  process.exit(1);
});

void bootstrap();
