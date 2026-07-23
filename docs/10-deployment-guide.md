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

## Rollback

1. Оставить предыдущий artifact id и `DEPLOYMENT_VERSION` доступными в настройках хостинга.
2. При ошибке после deploy вернуть предыдущий backend/frontend artifact как единый комплект.
3. Проверить `GET /health`, `GET /ready`, frontend root и `/api/bootstrap`.
4. Сверить `deploymentVersion` в health/readiness с ожидаемым rollback id.
5. Не откатывать secrets, если инцидент не связан с ротацией. Если связан, выполнить процедуру secret rotation из `docs/10-env-example.md`.

## Logs

Логи должны оставаться структурированными и sanitized. Не логировать tokens, cookies, authorization headers, ФИО, email, телефоны, названия сделок, полные CRM payloads и суммы отдельных сделок.
