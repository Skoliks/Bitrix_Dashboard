# Phase 9 QA Report

Дата: 2026-07-23

## Что сделано

- Добавлены backend integration/e2e gates в `backend/tests/e2e/qualityGates.test.ts`: CORS, iframe security headers, invalid filters before upstream calls, sanitized blocking errors with `requestId`.
- Добавлены frontend e2e guard checks в `dashboard-app/tests/e2e/frontendQuality.spec.ts`: отсутствие storage access для session token в app source, ограниченная MVP-навигация, наличие package quality scripts.
- Добавлены repo-level scripts:
  - `scripts/check-secrets.ps1`
  - `scripts/check-licenses.ps1`
- В `backend/package.json` и `dashboard-app/package.json` добавлены `security:scan` и `license:scan`.
- `dashboard-app/vitest.config.ts` расширен на `tests/e2e`, `dashboard-app` lint теперь проверяет `src tests`.
- Backend production config теперь отклоняет произвольный `VIBECODE_API_BASE_URL`; в production разрешен `vibecode.bitrix24.tech`.
- Backend logger дополнительно редактирует CRM/PII поля: ФИО, email, телефоны, названия сделок и monetary values.
- `scripts/check-secrets.ps1` теперь требует наличие `backend/dist` и `dashboard-app/dist`, чтобы scan не мог пройти без build artifacts.
- Убран шаблонный Bitrix24 warning text `Well done! Now paste this URL...`; добавлен guard test против возврата template copy.

## Автоматические проверки

- Backend targeted RED/GREEN:
  - `pnpm vitest run tests/http/logger.test.ts`
  - `pnpm vitest run tests/http/config.test.ts`
  - `pnpm vitest run tests/e2e/qualityGates.test.ts`
- Frontend targeted RED/GREEN:
  - `pnpm vitest run tests/e2e/frontendQuality.spec.ts`
  - RED был подтвержден до расширения `vitest.config.ts`: `No test files found`, потому что `tests/e2e` не входил в include.
- Security scan:
  - `cd backend; pnpm run security:scan`
  - `cd dashboard-app; pnpm run security:scan`
  - Negative check: запуск `scripts/check-secrets.ps1` на пустом temp-root падает с ошибкой о missing build artifacts.
- License scan:
  - `cd backend; pnpm run license:scan`
  - `cd dashboard-app; pnpm run license:scan`

## License Review Notes

- `BlueOak-1.0.0` и `EPL-2.0` добавлены в допустимые license patterns для текущего dependency graph.
- Две transitive зависимости не содержат license metadata в установленном `package.json` и не включают license-файл в tarball:
  - `@mapbox/jsonlint-lines-primitives@2.0.2`
  - `vaul-vue@0.4.1`
- Они добавлены как точечные manual-reviewed exceptions в `docs/09-license-exceptions.json`; `scripts/check-licenses.ps1` читает этот файл, поэтому основание review отделено от кода проверки. Это остается traceable item для финального юридического review, но не блокирует технический QA gate.

## Manual Acceptance

Тестовый портал Битрикс24 недоступен из текущего окружения, поэтому portal acceptance не выполнялся локально. В `docs/06-plan.md` этот пункт оставлен unchecked и остается external blocker для Phase 11/12 runtime проверки:

- левое меню Битрикс24;
- CRM-права текущего пользователя;
- restricted user;
- missing scopes;
- открытие карточки сделки;
- expired session в реальном iframe handoff;
- empty data и `meta.truncated=true` на реальных данных.

## Оставшиеся риски

- Frontend production bundle содержит строки Bitrix24 SDK, связанные с auth flow, но secret scan не нашел hardcoded `vibe_app_`, `vibe_api_`, `vibe_session_` token patterns; runtime storage проверен source-level, без браузерной инспекции iframe session.
- `@mapbox/jsonlint-lines-primitives@2.0.2` и `vaul-vue@0.4.1` требуют финального юридического review из-за отсутствующего license metadata в опубликованном tarball; исключения зафиксированы в `docs/09-license-exceptions.json`.
- Build frontend все еще предупреждает о chunk > 500 kB; это не сломало Phase 9 gates, но остается performance/packaging risk для Phase 10.
- Portal acceptance требует стабильной тестовой Битрикс24-среды и не может быть полностью заменен локальными integration tests.

## Phase 10 Packaging Follow-Up

- Добавлен production build gate `backend:build:production`, который собирает frontend `dashboard-app/dist` и backend `backend/dist`.
- Backend artifact больше не содержит compiled tests: production compile использует `backend/tsconfig.build.json`.
- Добавлен `scripts/check-artifact.ps1`; проверка блокирует secrets, logs, tests, fixtures, docs, QA artifacts и reference-папки в build output.
- Локальный production smoke подтверждает, что `/health`, `/ready` и frontend root обслуживаются backend, а `/api` и `/api/bootstrap` без signed handoff остаются API JSON-ответами и не перехватываются SPA fallback.
- Phase 10 review findings закрыты: binary static assets отдаются byte-for-byte без text transcoding, `/ready` покрыт static fallback test, artifact check дополнительно блокирует raw CRM/PII-like JSON field patterns.

## Phase 11 Runtime Follow-Up

- Artifact `192c9bb` развернут на Black Hole server `c318fdf4-8ac1-485d-8bfc-82eb87d2b872`, URL `https://app-b19d2b35af4a.vibecode.bitrix24.tech`.
- После деплоя пройдены `cd backend; pnpm run test` (23 files, 87 tests) и `cd dashboard-app; pnpm run test` (8 files, 37 tests).
- Runtime smoke через краткоживущий Black Hole access token подтвердил `200` для `/health`, `/ready`, frontend root и static JS/CSS assets.
- `/api`, `/api/bootstrap` и `/api/dashboard` в production не перехватываются SPA fallback: без signed user handoff они возвращают JSON `VALIDATION_ERROR`/`AUTH_REQUIRED`.
- Проверены production headers: CSP с `frame-ancestors`, `referrer-policy`, `x-content-type-options`, `permissions-policy`, allowed CORS origin и blocked origin.
- Runtime logs после smoke проверены на известные secret patterns; совпадений с app key, management API key, key fragments, `SESSION_CONTEXT_HMAC_SECRET`, bearer authorization strings и `vibe_session_` не найдено.
- Полный пользовательский `/api/bootstrap`/`/api/dashboard` acceptance остается для Phase 12, потому что нужен реальный Bitrix24 iframe/gateway handoff.
