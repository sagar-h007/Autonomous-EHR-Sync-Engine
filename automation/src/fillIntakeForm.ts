// =============================================================================
// fillIntakeForm.ts — Playwright Legacy EHR Portal Automation
// =============================================================================
// This script accepts a JSON-encoded PatientData object as its first CLI
// argument, launches a headless Chromium browser, and programmatically fills
// and submits the legacy EHR intake form.
//
// Usage (CLI — called by automation.service.ts):
//   npx ts-node fillIntakeForm.ts '{"firstName":"John","lastName":"Doe",...}'
//
// Usage (imported as a module in tests):
//   import { fillIntakeForm } from './fillIntakeForm';
//   await fillIntakeForm(patientData);
//
// Exit codes:
//   0 — Form submitted and success banner confirmed visible
//   1 — Any error (navigation failure, field not found, timeout, etc.)
// =============================================================================

import { chromium, Browser, Page } from 'playwright';
import path from 'path';

// ---------------------------------------------------------------------------
// PatientData — local type definition (mirrors backend schema, no dep needed)
// ---------------------------------------------------------------------------
interface PatientData {
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;
  gender:      'male' | 'female' | 'other' | 'unknown';
  reason:      string;
}

// ---------------------------------------------------------------------------
// fillIntakeForm — the core automation function
// ---------------------------------------------------------------------------
/**
 * Launches a Chromium browser, navigates to the legacy EHR portal, fills in
 * all patient demographics, and clicks Submit.
 *
 * @param patient  PatientData extracted by the LLM service
 * @param headless Whether to run headless (default: false for demo visibility)
 */
export async function fillIntakeForm(
  patient: PatientData,
  headless = false,   // non-headless by default — you can SEE the automation!
): Promise<void> {

  let browser: Browser | undefined;

  try {
    console.log('[Playwright] 🚀 Launching Chromium browser…');

    browser = await chromium.launch({
      headless,
      slowMo: 120,  // Slows each action by 120ms so humans can follow along
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page: Page = await context.newPage();

    // ── Navigate to the legacy portal ─────────────────────────────────────
    const htmlPath = path.resolve(
      __dirname,
      '../../legacy_ui_mock/index.html',
    );
    const fileUrl = `file://${htmlPath}`;

    console.log(`[Playwright] 🌐 Navigating to: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#intake-form', { state: 'visible' });

    console.log('[Playwright] 📋 Legacy EHR portal loaded. Starting form fill…');

    // ── Fill First Name ────────────────────────────────────────────────────
    console.log(`[Playwright]   → First Name: "${patient.firstName}"`);
    await page.fill('#firstName', patient.firstName);

    // ── Fill Last Name ─────────────────────────────────────────────────────
    console.log(`[Playwright]   → Last Name:  "${patient.lastName}"`);
    await page.fill('#lastName', patient.lastName);

    // ── Fill Date of Birth ─────────────────────────────────────────────────
    console.log(`[Playwright]   → DOB:        "${patient.dateOfBirth}"`);
    await page.fill('#dob', patient.dateOfBirth);

    // ── Select Gender ──────────────────────────────────────────────────────
    console.log(`[Playwright]   → Gender:     "${patient.gender}"`);
    await page.selectOption('#gender', patient.gender);

    // ── Fill Reason for Visit ──────────────────────────────────────────────
    console.log(`[Playwright]   → Reason:     "${patient.reason.substring(0, 60)}…"`);
    await page.fill('#reason', patient.reason);

    // ── Submit the form ────────────────────────────────────────────────────
    console.log('[Playwright] 📤 Clicking Submit button…');
    await page.click('#submit-btn');

    // ── Wait for success confirmation ──────────────────────────────────────
    // The legacy portal shows #success-banner after successful submission.
    // 5-second timeout — if the banner doesn't appear, the submission failed.
    console.log('[Playwright] ⏳ Waiting for success confirmation banner…');
    await page.waitForSelector('#success-banner', {
      state:   'visible',
      timeout: 5_000,
    });

    const bannerText = await page.textContent('#success-banner');
    console.log(`[Playwright] ✅ Success! Banner text: "${bannerText?.trim()}"`);

    // Brief pause so the user can see the completed state before browser closes
    await page.waitForTimeout(1_500);

  } finally {
    if (browser) {
      await browser.close();
      console.log('[Playwright] 🔒 Browser closed.');
    }
  }
}

// =============================================================================
// CLI Entrypoint — executed when run directly via: npx ts-node fillIntakeForm.ts
// =============================================================================
// We guard with require.main so the function is still importable as a module
// in tests without triggering the CLI path.
// =============================================================================
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || !args[0]) {
    console.error('[Playwright] ❌ Error: Patient data JSON is required as the first argument.');
    console.error('   Usage: npx ts-node fillIntakeForm.ts \'{"firstName":"John",...}\'');
    process.exit(1);
  }

  let patient: PatientData;
  try {
    patient = JSON.parse(args[0]) as PatientData;
  } catch {
    console.error('[Playwright] ❌ Error: First argument is not valid JSON.');
    process.exit(1);
  }

  fillIntakeForm(patient)
    .then(() => {
      console.log('[Playwright] 🏁 Automation complete. Exiting with code 0.');
      process.exit(0);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Playwright] ❌ Automation failed: ${message}`);
      process.exit(1);
    });
}
