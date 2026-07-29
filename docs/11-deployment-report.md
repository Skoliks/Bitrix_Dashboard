# Phase 11 Deployment Report

Дата: 2026-07-23

## Deployment Target

- Hosting: VibeCode Black Hole
- Server ID: `c318fdf4-8ac1-485d-8bfc-82eb87d2b872`
- Public URL: `https://app-b19d2b35af4a.vibecode.bitrix24.tech`
- Bitrix24 allowed origin: `https://b24-t2iy2g.bitrix24.ru`
- Runtime: `node20`
- Access policy at smoke time: `OWNER_ONLY`
- Display name: `Дашборд воронки продаж`
- Description: `Read-only дашборд KPI, воронки и последних сделок CRM Битрикс24.`

## Artifact

- Source commit/artifact id: `192c9bb`
- Deployed version: `192c9bb`
- Archive layout:
  - `backend/package.json`
  - `backend/pnpm-lock.yaml`
  - `backend/dist/**`
  - `dashboard-app/dist/**`
- Archive size: `1,477,210` bytes
- Forbidden archive entries found before deploy: `0`

The deploy archive was built from an allowlist and did not include `.env`, logs, tests, fixtures, docs, QA artifacts, source fixtures, `node_modules`, or reference project folders.

## Deploy Configuration

```json
{
  "runtime": "node20",
  "install": "corepack enable && cd /opt/app/backend && pnpm install --prod --frozen-lockfile",
  "start": "cd /opt/app/backend && node dist/index.js",
  "port": 3000,
  "healthPath": "/health",
  "extractTo": "/opt/app",
  "cleanDeploy": true
}
```

Runtime env profile, without secret values:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DEPLOYMENT_VERSION=192c9bb
APP_PUBLIC_URL=https://app-b19d2b35af4a.vibecode.bitrix24.tech
BITRIX24_ALLOWED_ORIGINS=https://b24-t2iy2g.bitrix24.ru
VIBECODE_API_BASE_URL=https://vibecode.bitrix24.tech
VIBECODE_APP_KEY=<server-side secret>
SESSION_CONTEXT_MODE=signed-headers
SESSION_CONTEXT_HMAC_SECRET=<server-side secret>
FRONTEND_DIST_DIR=/opt/app/dashboard-app/dist
```

Deploy API response returned `success=true`, `status=running`, `appUrl=https://app-b19d2b35af4a.vibecode.bitrix24.tech`.

## Runtime Smoke

Because the Black Hole server is `OWNER_ONLY`, direct anonymous requests return the platform access page or `BH_LOGIN_REQUIRED`. Runtime smoke was executed with short-lived Black Hole `api-bearer` access tokens. The temporary tokens were revoked after smoke; a follow-up token list check returned `0` Phase 11 temporary tokens.

| Check | Result |
| --- | --- |
| `GET /health` | `200`, JSON, `version=192c9bb` |
| `GET /ready` with allowed Origin | `200`, JSON, `deploymentVersion=192c9bb`, CORS allow origin returned |
| Frontend root `/` | `200`, `text/html`, contains `id="app"` |
| Frontend assets | `200` for JS and CSS assets, immutable cache headers present |
| `GET /api` | `404`, JSON `VALIDATION_ERROR`, not SPA HTML |
| `GET /api/bootstrap` without signed user handoff | `401`, JSON `AUTH_REQUIRED`, not SPA HTML |
| `GET /api/dashboard` without signed user handoff | `401`, JSON `AUTH_REQUIRED`, not SPA HTML |
| `GET /ready` with blocked Origin | `403`, JSON `CRM_ACCESS_DENIED`, no CORS allow origin |

Security headers verified on runtime responses:

- `Content-Security-Policy` includes `frame-ancestors 'self' https://b24-t2iy2g.bitrix24.ru`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Logs

Runtime logs were fetched through the VibeCode Infra API after smoke. The inspected log payload did not contain the known app key, management API key, key fragments, `SESSION_CONTEXT_HMAC_SECRET`, bearer authorization strings, or `vibe_session_` token patterns.

## Verification

- `cd backend; pnpm run build:production` - passed.
- `cd backend; pnpm run test` - 23 files, 87 tests passed.
- `cd backend; pnpm run artifact:check` - passed.
- `cd backend; pnpm run security:scan` - passed.
- `cd dashboard-app; pnpm run test` - 8 files, 37 tests passed.
- `cd dashboard-app; pnpm run security:scan` - passed.
- Runtime smoke against `https://app-b19d2b35af4a.vibecode.bitrix24.tech` - passed for platform-reachable endpoints and expected unauthenticated API errors.

## Remaining Risks

- Full `/api/bootstrap` and `/api/dashboard` smoke with a real Bitrix24 user session was not completed in Phase 11 because the deployed runtime needs a real signed gateway handoff. Current production behavior without that handoff is controlled JSON `AUTH_REQUIRED`.
- Current Black Hole access policy is `OWNER_ONLY`. Phase 12 Bitrix24 embedding may require changing hosting access or using the platform-approved embedding path before iframe acceptance can pass.
- The app and management keys were provided in chat before deploy. They are not stored in repo files, but they should be rotated after the first successful runtime smoke.
- Frontend production build still emits the known chunk size warning for the large JS/CSS bundle. This is a performance risk, not a Phase 11 deploy blocker.

## Phase 12 Runtime Update

Date: 2026-07-29

- Production was updated to commit `7420c0c`, VibeCode source snapshot `v4`.
- `SESSION_CONTEXT_MODE` is now `gateway-headers`. The backend accepts the platform Gateway bearer only through `X-Vibe-Authorization`, then resolves the authenticated portal and user server-side with `/v1/me`.
- `/health`, `/ready`, `/`, and `/_gw/icon` passed production smoke. The root contains `id="app"` and links to the platform favicon. `/api/bootstrap` and `/api/dashboard` without a real Gateway user session returned JSON `401 AUTH_REQUIRED` as expected.
- An SVG application icon was uploaded through the Infra API. A temporary technical smoke token was revoked; the post-smoke active token count was `0`.
- A real Bitrix24 placement smoke is still blocked until an administrator completes OAuth and enables the required Marketplace subscription. See `docs/12-acceptance-report.md`.
