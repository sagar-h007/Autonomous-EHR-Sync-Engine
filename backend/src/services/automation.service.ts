// =============================================================================
// automation.service.ts — Playwright Fallback Orchestration
// =============================================================================
// Spawns the Playwright fill-form script as an isolated child process.
//
// Architecture rationale for child_process.spawn():
//   • Playwright launches a full Chromium browser process. Running Chromium
//     inside the Express event loop would block concurrent request handling
//     and risk a Chromium crash bringing down the API server.
//   • A child process is fully isolated: its crash, OOM, or exit code cannot
//     affect the Express parent process.
//   • stdio: 'inherit' pipes Playwright's console output straight to the
//     terminal so operators see exactly what the browser automation is doing.
// =============================================================================

import { spawn } from 'child_process';
import path from 'path';
import { PatientData } from '../types/patient.types';

// ---------------------------------------------------------------------------
// Resolve the automation script path relative to this service file.
// In ts-node (dev):  __dirname = backend/src/services/
// In compiled JS:    __dirname = backend/dist/services/
// Either way, going up 3 levels (past services/ → src|dist/ → backend/)
// and then into automation/src/ works correctly.
// ---------------------------------------------------------------------------
const AUTOMATION_SCRIPT = path.resolve(
  __dirname,
  '../../../automation/src/fillIntakeForm.ts',
);

const AUTOMATION_CWD = path.resolve(__dirname, '../../../automation');

// ---------------------------------------------------------------------------
// runPlaywrightFallback
// ---------------------------------------------------------------------------
/**
 * Spawns the Playwright automation script to fill the legacy EHR portal form.
 * Passes PatientData as a JSON-encoded CLI argument.
 *
 * @param patient  Validated patient demographics
 * @returns        Promise that resolves when the Playwright process exits 0
 * @throws         Error if the process exits with a non-zero code or fails to spawn
 */
export async function runPlaywrightFallback(patient: PatientData): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    console.log('[Automation] Spawning Playwright child process…');
    console.log('[Automation] Script:', AUTOMATION_SCRIPT);

    // Serialize patient data as a single JSON CLI argument
    const patientJson = JSON.stringify(patient);

    const child = spawn(
      'npx',
      ['ts-node', AUTOMATION_SCRIPT, patientJson],
      {
        cwd: AUTOMATION_CWD,
        // 'inherit' = child's stdout/stderr flow directly to our terminal
        stdio: ['inherit', 'inherit', 'inherit'],
        // Pass full env so DISPLAY, PATH, etc. are available for Chromium
        env: { ...process.env },
        // Shell: false (default) — safer, avoids shell injection
        shell: false,
      },
    );

    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Automation] ✅ Playwright process exited successfully (code 0).');
        resolve();
      } else {
        reject(
          new Error(
            `[Automation] Playwright process exited with non-zero code: ${code ?? 'null'}`,
          ),
        );
      }
    });

    child.on('error', (err) => {
      reject(
        new Error(
          `[Automation] Failed to spawn Playwright process: ${err.message}`,
        ),
      );
    });
  });
}
