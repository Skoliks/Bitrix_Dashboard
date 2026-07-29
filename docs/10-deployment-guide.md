# Phase 10 Deployment Guide

Дата: 2026-07-23

Phase 10 готовит production artifact без деплоя. Деплой, HTTPS URL и Bitrix24 placement остаются для Phase 11/12.

## Build

```powershell
cd backend
pnpm run build:production
pnpm run artifact:check
```

Команда собирает `dashboard-app/dist` через Vite, затем компилирует backend в `backend/dist`. Backend build использует `tsconfig.build.json`, поэтому в server artifact не попадают `tests`, `vitest.config.ts` и `eslint.config.js`.

## Black Hole Deploy Payload

Phase 10.5 confirmed server `c318fdf4-8ac1-485d-8bfc-82eb87d2b872` is `running`, `BLACKHOLE`, `CONNECTED`, `STANDALONE`, and `node20` runtime exists. Phase 11 should deploy an allowlisted archive, not the full repository.

Recommended archive entries:

```text
backend/package.json
backend/pnpm-lock.yaml
backend/dist/**
dashboard-app/dist/**
```

Recommended deploy fields:

```json
{
  "runtime": "node20",
  "install": "corepack enable && cd /opt/app/backend && pnpm install --prod --frozen-lockfile",
  "start": "cd /opt/app/backend && node dist/index.js",
  "port": 3000,
  "healthPath": "/health",
  "extractTo": "/opt/app",
  "cleanDeploy": true,
  "displayName": "Дашборд воронки продаж",
  "description": "Read-only дашборд KPI, воронки и последних сделок CRM Битрикс24."
}
```

Do not store real `VIBECODE_APP_KEY`, management API key or `SESSION_CONTEXT_HMAC_SECRET` in this file. Provide them only through server-side deploy env.

Before Phase 11 deploy, rotate the management `vibe_api_...` key that was shared during preparation and use only the rotated key for deploy. Prefer rotating the app `vibe_app_...` key before deploy too; if that is not practical, rotate it immediately after the first successful smoke.

## Artifact Layout

- `dashboard-app/dist/` - статический frontend bundle.
- `backend/dist/` - Node.js server entrypoint `index.js` и runtime modules.
- `backend/package.json`, `backend/pnpm-lock.yaml` и production env хостинга нужны для запуска backend, но secrets задаются только через server-side env.

В artifact не должны входить `.env`, `.env.*`, `*.log`, `node_modules`, `tests`, `fixtures`, `docs`, `qa_reports`, `b24-ai-starter/`, `templates-dashboard-vue/` и raw CRM fixtures.

## Runtime

```powershell
cd backend
$env:NODE_ENV='production'
$env:PORT='3000'
$env:LOG_LEVEL='info'
$env:DEPLOYMENT_VERSION='replace_with_commit_or_release_id'
$env:APP_PUBLIC_URL='https://replace-with-public-app-url.example.com'
$env:BITRIX24_ALLOWED_ORIGINS='https://replace-with-portal.bitrix24.com'
$env:VIBECODE_API_BASE_URL='https://vibecode.bitrix24.tech'
$env:VIBECODE_APP_KEY='replace_with_server_side_vibe_app_key'
$env:SESSION_CONTEXT_MODE='signed-headers'
$env:SESSION_CONTEXT_HMAC_SECRET='replace_with_gateway_handoff_hmac_secret'
$env:FRONTEND_DIST_DIR='../dashboard-app/dist'
node dist/index.js
```

For the current Black Hole target use:

```env
APP_PUBLIC_URL=https://app-b19d2b35af4a.vibecode.bitrix24.tech
BITRIX24_ALLOWED_ORIGINS=https://b24-t2iy2g.bitrix24.ru
FRONTEND_DIST_DIR=/opt/app/dashboard-app/dist
```

Backend отдает:

- `GET /health` - liveness без обращения к VibeCode.
- `GET /ready` - readiness и public config без secrets.
- `GET /api/bootstrap` и `GET /api/dashboard` - API routes, которые не перехватываются SPA fallback.
- `GET /` и frontend routes без расширения - `index.html`.
- `GET /assets/*` - static assets с immutable cache.

## Smoke

```powershell
Invoke-WebRequest http://127.0.0.1:3000/health
Invoke-WebRequest http://127.0.0.1:3000/ready -Headers @{ Origin='https://replace-with-portal.bitrix24.com' }
Invoke-WebRequest http://127.0.0.1:3000/
Invoke-WebRequest http://127.0.0.1:3000/api/bootstrap -Headers @{ Origin='https://replace-with-portal.bitrix24.com' }
```

Для полного `/api/bootstrap` smoke нужен подписанный gateway handoff текущего пользователя. Без него production backend должен вернуть контролируемую `AUTH_REQUIRED`/validation ошибку, а не frontend HTML.

## Phase 11 Deployment Result

Phase 11 deployed artifact `192c9bb` to Black Hole server `c318fdf4-8ac1-485d-8bfc-82eb87d2b872` at `https://app-b19d2b35af4a.vibecode.bitrix24.tech`.

The production server is `running`, `CONNECTED`, and currently uses `OWNER_ONLY` access policy. Anonymous direct requests are blocked by the platform, so runtime smoke used short-lived Black Hole `api-bearer` access tokens that were revoked after checks.

Verified runtime results:

- `GET /health` returned `200` JSON with `version=192c9bb`.
- `GET /ready` returned `200` JSON with `deploymentVersion=192c9bb`.
- Frontend root returned `200` HTML, and JS/CSS assets returned `200` with immutable cache headers.
- `/api`, `/api/bootstrap`, and `/api/dashboard` returned JSON API errors without SPA fallback.
- Allowed origin `https://b24-t2iy2g.bitrix24.ru` received CORS allow origin; blocked origin received `403` without CORS allow origin.
- CSP, `frame-ancestors`, `referrer-policy`, `x-content-type-options`, and `permissions-policy` headers were present.

See `docs/11-deployment-report.md` for the deploy record, env profile without secret values, smoke evidence, log check and remaining Phase 12 risks.

## Rollback

1. Оставить предыдущий artifact id и `DEPLOYMENT_VERSION` доступными в настройках хостинга.
2. При ошибке после deploy вернуть предыдущий backend/frontend artifact как единый комплект.
3. Проверить `GET /health`, `GET /ready`, frontend root и `/api/bootstrap`.
4. Сверить `deploymentVersion` в health/readiness с ожидаемым rollback id.
5. Не откатывать secrets, если инцидент не связан с ротацией. Если связан, выполнить процедуру secret rotation из `docs/10-env-example.md`.

## Logs

Логи должны оставаться структурированными и sanitized. Не логировать tokens, cookies, authorization headers, ФИО, email, телефоны, названия сделок, полные CRM payloads и суммы отдельных сделок.
