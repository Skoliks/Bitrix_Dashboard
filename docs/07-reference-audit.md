# Phase 0 Reference Audit

Date: 2026-07-22

## Reference Sources Read

- `b24-ai-starter/README.md`
- `b24-ai-starter/backends/node/api/server.js`
- `b24-ai-starter/backends/node/api/utils/verifyToken.js`
- `b24-ai-starter/backends/node/api/package.json`
- `b24-ai-starter/scripts/README.md`
- `b24-ai-starter/scripts/security-scan.sh`
- `b24-ai-starter/instructions/knowledge.md`
- `b24-ai-starter/instructions/node/*`
- `b24-ai-starter/instructions/front/*`
- `templates-dashboard-vue/package.json`
- selected current `dashboard-app/src` layout/home/chart/stats patterns

## Backend Patterns To Reuse

- Environment validation before serving readiness.
- Dedicated liveness/readiness endpoints.
- Centralized auth/session extraction layer.
- Centralized error mapping with stable internal codes.
- Structured logs with explicit secret redaction.
- Security scan/checklist pattern from starter scripts.
- Node.js 20 runtime target.
- Keep app secrets only in backend env.

## Backend Patterns Not To Reuse Directly

- Starter Node API uses Express demo routes and generic `cors()`; MVP BFF needs restricted CORS and no demo routes.
- Starter `verifyToken.js` validates a local JWT created by `/api/getToken`; production BFF must use VibeCode Gateway/user session protocol, not mint arbitrary frontend JWTs unless Phase 0/production gateway explicitly requires that exchange.
- Starter `/api/install` and `/api/getToken` log raw request bodies; production logs must not contain Bitrix auth payloads or session data.
- Starter Node backend depends on PostgreSQL by default; MVP Phase 0/1 does not need DB.
- Starter demo endpoints `/api/enum` and `/api/list` are not production patterns.

## Frontend Patterns To Reuse

- `B24DashboardGroup`, `B24DashboardSidebar`, `B24NavigationMenu`, `B24DashboardSearch` shell patterns.
- B24 UI card/grid/table visual language.
- Bitrix24 icons from `@bitrix24/b24icons-vue`.
- Existing Unovis chart styling and theme variables.
- Existing TanStack Table dependency for future recent-deals grid.
- Existing `@internationalized/date` and `date-fns` split: calendar date state vs formatting.
- Loading skeleton patterns.
- Localization structure in `src/locales`.

## Frontend Patterns Not To Reuse Directly

- Template navigation pages (`Inbox`, `Customers`, `Settings`) are demo/product-template screens, not MVP dashboard requirements.
- Cookie consent toast from template should not be carried into the Bitrix24 iframe MVP unless a real cookie feature is added.
- Template dashboard mock data/composables must be replaced by backend DTOs.
- Current external GitHub/help links are template affordances and should not appear in MVP dashboard UI.

## Deployment And Black Hole Notes

VibeCode `/v1/me` guide confirms Black Hole style infra supports `node20` examples, source archive deployment, start command configuration, logs, access URLs, and retryable 429 deploy pressure. Production packaging should keep a single Node.js service that serves static frontend and `/api/*` where possible.

Open deployment checks for later phases:

- real Black Hole deployment smoke;
- exact healthcheck configuration;
- rollback artifact procedure;
- public HTTPS and allowed origins.

## License Audit

Direct dependency metadata checked via `pnpm view <package> license`.

Allowed licenses found:

- MIT
- Apache-2.0

Direct packages checked:

- `@bitrix24/b24icons-vue`: MIT
- `@bitrix24/b24jssdk`: MIT
- `@bitrix24/b24ui-nuxt`: MIT
- `@internationalized/date`: Apache-2.0
- `@tanstack/table-core`: MIT
- `@tanstack/vue-table`: MIT
- `@unhead/vue`: MIT
- `@unovis/ts`: Apache-2.0
- `@unovis/vue`: Apache-2.0
- `@vueuse/core`: MIT
- `date-fns`: MIT
- `scule`: MIT
- `tailwindcss`: MIT
- `vue`: MIT
- `vue-i18n`: MIT
- `vue-router`: MIT
- `zod`: MIT
- backend Phase 1 direct dev tooling: MIT or Apache-2.0

`pnpm licenses list --json` did not complete because local pnpm store package index files were missing. Full transitive license scan remains required in Phase 9 after dependency install/store refresh.

## Production Decisions

- Use no production backend framework until a framework provides a concrete benefit; built-in Node HTTP keeps runtime/license/deploy surface smaller.
- Do not add DB/cache infrastructure for MVP bootstrap unless reference data caching needs outgrow in-memory TTL.
- Keep all architecture docs, research, fixtures, QA, deployment and handoff material in `docs/`.
- Use `b24-ai-starter/` and `templates-dashboard-vue/` only as reference folders, never production runtime.

