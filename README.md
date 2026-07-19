# 🏥 Autonomous EHR Sync Engine

A production-grade TypeScript monorepo that accepts unstructured patient intake text, extracts structured demographics, syncs via **FHIR R4 REST APIs**, and automatically falls back to **Playwright UI automation** when the API is unavailable. All attempts are durably logged to **PostgreSQL** via Prisma ORM.

---

## Architecture

```
POST /api/process-intake
        │
        ▼
┌─────────────────────┐
│   Mock LLM Service  │  Extracts PatientData from raw text
│   (llm.service.ts)  │  (Zod-validated output)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   FHIR R4 Service   │  Maps to FHIR Patient resource
│   (fhir.service.ts) │  POSTs to hapi.fhir.org/baseR4
└────────┬────────────┘
         │
   ┌─────┴─────────────────────────────────┐
   │ SUCCESS                               │ FHIRSyncError
   ▼                                       ▼
SUCCESS_API                    ┌─────────────────────────────┐
                               │   Playwright Automation     │
                               │ (automation.service.ts)     │
                               │  → child_process.spawn()    │
                               │  → fillIntakeForm.ts        │
                               │  → legacy_ui_mock/index.html│
                               └──────────┬──────────────────┘
                                          │
                               ┌──────────┴──────────────┐
                               │ SUCCESS       │  FAILED  │
                               ▼               ▼          │
                       SUCCESS_FALLBACK      FAILED       │
                                                          │
                               ┌──────────────────────────┘
                               ▼
                    ┌────────────────────┐
                    │   Prisma / Postgres │  Logs all outcomes
                    │   (IntakeLog model) │  to intake_logs table
                    └────────────────────┘
```

---

## Project Structure

```
ehr-sync-engine/
├── package.json              ← npm workspaces root
├── docker-compose.yml        ← PostgreSQL dev database
├── backend/                  ← Express API (port 4000)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── server.ts         ← HTTP server entry point
│       ├── app.ts            ← Express app factory
│       ├── prisma.ts         ← Singleton Prisma client
│       ├── types/            ← Zod schemas + TS types
│       ├── errors/           ← FHIRSyncError
│       ├── middleware/       ← Error handler + AppError
│       ├── services/
│       │   ├── llm.service.ts        ← Mock LLM extraction
│       │   ├── fhir.service.ts       ← FHIR R4 push
│       │   └── automation.service.ts ← Playwright spawner
│       └── routes/
│           └── intake.ts     ← POST /api/process-intake
├── legacy_ui_mock/
│   └── index.html            ← Simulated legacy EHR portal
└── automation/               ← Playwright fallback runner
    └── src/
        └── fillIntakeForm.ts ← CLI + importable module
```

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker & Docker Compose (for the database)

### 2. Start the Database

```bash
# From the monorepo root
docker-compose up -d

# Verify it's running
docker-compose ps
```

### 3. Install Dependencies

```bash
npm install                          # installs all workspaces
npx playwright install chromium      # download Chromium for Playwright
```

### 4. Configure Environment

```bash
cp backend/.env.example backend/.env
# The default DATABASE_URL matches the docker-compose setup — no edits needed
```

### 5. Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 6. Start the API Server

```bash
npm run dev
# → http://localhost:4000
```

---

## API Endpoints

### `GET /health`

```json
{ "status": "ok", "service": "ehr-sync-engine", "timestamp": "..." }
```

### `POST /api/process-intake`

**Request body:**
```json
{
  "rawText": "Patient John Doe, 38 years old male, presenting with chest pain..."
}
```

**Query params:**
- `?simulateFhirFailure=true` — forces FHIR failure to demo the Playwright fallback

**Response (SUCCESS_API):**
```json
{
  "success": true,
  "data": {
    "logId": "uuid-here",
    "status": "SUCCESS_API",
    "fhirId": "12345",
    "patientData": { "firstName": "John", "lastName": "Doe", ... },
    "message": "✅ Patient data successfully synced via FHIR R4 API."
  }
}
```

**Response (SUCCESS_FALLBACK):**
```json
{
  "success": true,
  "data": {
    "logId": "uuid-here",
    "status": "SUCCESS_FALLBACK",
    "message": "⚠️ FHIR API was unavailable. Patient data synced via legacy UI automation fallback."
  }
}
```

---

## Demo Walkthrough

### Path A — Happy path (FHIR API success)

```bash
curl -s -X POST http://localhost:4000/api/process-intake \
  -H "Content-Type: application/json" \
  -d '{"rawText": "Patient John Doe born 1985-03-15 presenting with persistent chest pain"}' \
  | jq .
```

### Path B — Fallback path (Playwright automation)

```bash
curl -s -X POST "http://localhost:4000/api/process-intake?simulateFhirFailure=true" \
  -H "Content-Type: application/json" \
  -d '{"rawText": "Patient John Doe born 1985-03-15 presenting with persistent chest pain"}' \
  | jq .
```

> A Chromium browser window will open, visibly fill the legacy EHR form, and submit it. The response will show `"status": "SUCCESS_FALLBACK"`.

### View Logs in Prisma Studio

```bash
npm run db:studio
# → Opens http://localhost:5555 with a visual DB browser
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7 (strict) |
| Runtime | Node.js 18+ |
| API Framework | Express 4 |
| Schema Validation | Zod |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| HTTP Client | Axios |
| Healthcare Standard | HL7 FHIR R4 |
| FHIR Server | HAPI FHIR (public test instance) |
| UI Automation | Playwright (Chromium) |

---

## Replacing the Mock LLM

To swap the mock LLM with a real one, edit only `backend/src/services/llm.service.ts`:

```typescript
// Replace the mockLlmOutput block with:
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  response_format: { type: 'json_object' },
  messages: [{ role: 'user', content: EXTRACTION_PROMPT + rawText }],
});
const parsed = JSON.parse(response.choices[0].message.content);
const validated = PatientDataSchema.parse(parsed);
```

Everything downstream (FHIR mapping, Playwright fallback, DB logging) remains unchanged.
