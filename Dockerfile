# =============================================================================
# Dockerfile — EHR Sync Engine Backend
# =============================================================================
# Uses the official Playwright image which includes all Chromium system deps.
# This is critical — Playwright's Chromium won't launch on a bare Node image
# without installing ~300MB of system libraries manually.
# =============================================================================

FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
# Copy manifests first for better layer caching
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY automation/package*.json ./automation/

# Install all workspace deps
RUN npm ci --workspace=backend --workspace=automation

# ── Copy source ───────────────────────────────────────────────────────────────
COPY backend/ ./backend/
COPY automation/ ./automation/
COPY legacy_ui_mock/ ./legacy_ui_mock/

# ── Generate Prisma client ────────────────────────────────────────────────────
RUN cd backend && npx prisma generate

# ── Build TypeScript ──────────────────────────────────────────────────────────
# (optional — ts-node runs directly in prod for simplicity)
# RUN cd backend && npm run build

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 4000

# ── Run migrations then start ─────────────────────────────────────────────────
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node -r ts-node/register src/server.ts"]
