# Phase 12 Handoff

Date: 2026-07-29

## Delivered

- Production URL: `https://app-b19d2b35af4a.vibecode.bitrix24.tech`
- Production commit: `7420c0c`
- Session handoff: VibeCode Gateway header `X-Vibe-Authorization` is processed server-side. The browser does not receive or store a VibeCode session token.
- Required scopes confirmed: `crm`, `user_brief`, `placement`.
- Production icon: uploaded to the server; the application HTML references `/_gw/icon`.

## Runtime Configuration

Set these names only in the server-side deployment environment. Do not put their values in Git, frontend code, or this document.

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DEPLOYMENT_VERSION=<release-commit>
APP_PUBLIC_URL=https://app-b19d2b35af4a.vibecode.bitrix24.tech
BITRIX24_ALLOWED_ORIGINS=https://b24-t2iy2g.bitrix24.ru
VIBECODE_API_BASE_URL=https://vibecode.bitrix24.tech
VIBECODE_APP_KEY=<server-side OAuth application key>
SESSION_CONTEXT_MODE=gateway-headers
FRONTEND_DIST_DIR=/opt/app/dashboard-app/dist
```

## Next Owner Action

1. Open the VibeCode browser flow while signed in to the target Bitrix24 portal and complete OAuth for the application. Do not copy the resulting bearer token into chat.
2. Ensure the Bitrix24 Marketplace subscription, or its available trial, is active for the portal.
3. Bind the `LEFT_MENU` placement through the VibeCode platform handler, using the deployed URL and the title `Дашборд воронки продаж`.
4. Open the new left-menu item as a user with CRM access and complete the pending checks in `docs/12-acceptance-report.md`.
5. Repeat with a restricted CRM user and record the visible deal set and error handling.
6. Rotate the application and management keys that were previously shared in chat, then update server-side secrets only.

## Smoke Commands

Use a short-lived Black Hole `api-bearer` only for technical endpoints. It does not create a Bitrix24 user session and therefore cannot pass the user-context dashboard checks.

```text
GET /health
GET /ready with Origin: https://b24-t2iy2g.bitrix24.ru
GET /
GET /_gw/icon
GET /api/bootstrap without a Gateway user session -> 401 AUTH_REQUIRED
GET /api/dashboard without a Gateway user session -> 401 AUTH_REQUIRED
```

For a real placement request, the Gateway injects `X-Vibe-Authorization`. The backend resolves the current portal and user with server-side `GET /v1/me` and then calls read-only CRM APIs in that user context.

## MVP Boundaries

- The dashboard remains read-only: it does not create, update, or delete CRM records.
- Dashboard data flows through the backend BFF; the frontend does not contain VibeCode keys or session tokens.
- The remaining work is acceptance in a real Bitrix24 placement, not a fallback to a shared server-side personal API key.
