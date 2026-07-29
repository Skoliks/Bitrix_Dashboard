# Дашборд воронки продаж Битрикс24 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** реализовать read-only дашборд воронки продаж для Битрикс24: production frontend в `dashboard-app/`, production BFF в `backend/`, интеграция с VibeCode API через пользовательскую сессию, нормализованные DTO, KPI, воронка, график, таблица последних сделок и финальный деплой.

**Architecture:** `dashboard-app/` остаётся единственным production frontend и постепенно переделывается из Bitrix24 dashboard template под интерфейс воронки продаж. `backend/` создаётся как отдельный production BFF: хранит `vibe_app` key, принимает пользовательский контекст/сессию, вызывает VibeCode API, нормализует данные, кэширует справочники и отдаёт frontend готовые DTO. `b24-ai-starter/` и `templates-dashboard-vue/` используются только как reference-папки для паттернов и сравнения, не как production-код.

**Tech Stack:** Vue 3, Vite, TypeScript, Bitrix24 UI/icons, `@bitrix24/b24jssdk`, TanStack Table, Unovis, `@internationalized/date`, `date-fns`, Zod, Vitest, Node.js 20 BFF, Black Hole или согласованный production-хостинг.

## Global Constraints

- Production frontend находится только в `dashboard-app/`.
- Production backend находится только в новой папке `backend/`.
- `b24-ai-starter/` - справочный шаблон Bitrix24/VibeCode/Black Hole; использовать как источник паттернов, но не считать production-кодом.
- `templates-dashboard-vue/` - исходный UI-шаблон; использовать как reference, он ignored и не участвует в production runtime.
- Архитектурные документы, планы, research reports, QA reports, deployment reports и handoff-документы хранить только в `docs/`.
- MVP read-only: приложение не создаёт, не изменяет и не удаляет сделки CRM.
- Frontend не содержит `vibe_app_...`, `vibe_api_...` или пользовательский session token.
- Все CRM-данные идут через `backend/` и VibeCode API в пользовательском контексте текущего пользователя.
- Пользовательский session context нельзя считать production boundary, пока backend не проверяет источник/подпись gateway session handoff; неподписанные client-supplied `Authorization`, `X-Bitrix24-Domain`, `X-Bitrix24-User-Id` допустимы только как временный dev/provisional механизм и должны быть отклонены production negative tests.
- Сервисный ключ `vibe_api_...` разрешён только для разработки, диагностики и smoke-тестов вне пользовательского MVP.
- В MVP нет режима «Все воронки», фильтра по ответственному, фильтра по отделу, собственной ролевой модели, истории переходов стадий, автоконвертации валют и write-операций CRM.
- Минимальные production scopes зафиксировать как `crm,user_brief`, если research не докажет необходимость другого набора.
- Суммы разных валют не объединять; сделки без валюты учитывать в количестве, но исключать из денежных сумм.
- Состояние сделки определять по `stageSemanticId`, fallback из `/v1/statuses`; не угадывать по названию стадии.
- UI хранит календарные даты без времени; BFF рассчитывает границы периода в timezone портала.
- Справочники кэшировать краткосрочно; пользовательские агрегаты в MVP не кэшировать либо кэшировать только с ключом portal/user/filters на 30-60 секунд.
- Логи не содержат токены, cookies, authorization headers, ФИО, email, телефоны, названия сделок, полные CRM-ответы и суммы отдельных сделок.
- Допустимые лицензии без согласования: `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`; `MPL-2.0`, `LGPL`, `CC-BY` требуют ручной проверки; `GPL`, `AGPL`, `SSPL`, `BUSL`, `Unknown`, `Unlicensed` не использовать без отдельного согласования.
- Деплой выполнять только в финальных фазах после contract, unit, integration, UI, security и license-проверок.

---

## Source Documents

- `docs/bitrix24_sales_funnel_dashboard_concept.md` - продуктовая цель, MVP-состав, ограничения, API-сущности и acceptance criteria.
- `docs/02-spec.md` - техническая архитектура, DTO, BFF API, расчёты, безопасность, тестовая стратегия и критерии готовности.
- `docs/03-research-brief.md` - вопросы, которые нужно закрыть до реализации интеграционного слоя.
- `docs/05-ui-brief.md` - UX, структура экрана, состояния, визуальный стиль, адаптивность и UI acceptance checklist.
- `docs/06-plan.md` - этот implementation plan.
- `docs/07-session-boundary-report.md` - Phase 4.5 session boundary decision, signed gateway handoff contract и residual real iframe capture risk.

## Repository Roles

- `dashboard-app/`: production Vue frontend. Сохранять полезные Bitrix24 UI-паттерны, но постепенно заменить шаблонные страницы и demo-сценарии на интерфейс дашборда воронки продаж.
- `backend/`: новый production BFF. Создать с нуля, опираясь на patterns из `b24-ai-starter/`, но не копируя шаблон без ревью.
- `b24-ai-starter/`: reference для Bitrix24/VibeCode/Black Hole, auth/session, deployment и security-паттернов.
- `templates-dashboard-vue/`: reference исходного UI-шаблона; не менять в рамках production-работ, кроме случаев явного обновления reference.
- `docs/`: единое место для архитектуры, планов, research results, QA, deployment и acceptance reports.

## Phase 0. Reference Audit And Research Lockdown

**Цель:** закрыть неизвестные внешние контракты и понять, какие паттерны брать из reference-папок, до создания production BFF.

**Файлы:**
- Создать: `docs/07-research-results.md`
- Создать: `docs/07-api-contracts.md`
- Создать: `docs/07-reference-audit.md`
- Создать: `docs/fixtures/vibecode/*.redacted.json`
- Изменить: `docs/02-spec.md` только если research выявит расхождение со спецификацией
- Читать без production-изменений: `b24-ai-starter/README.md`, `b24-ai-starter/backends/node/api/*`, `b24-ai-starter/scripts/*`, `b24-ai-starter/instructions/*`
- Читать без production-изменений: `templates-dashboard-vue/src/**/*`, `templates-dashboard-vue/package.json`

**Работы:**
- [x] Изучить доступные reference/docs по VibeCode Gateway session handoff, зафиксировать целевую backend-only модель и явно отметить, что точный header/cookie/signature требует real iframe capture перед hardening session middleware.
- [x] Зафиксировать минимальные scopes: `crm,user_brief` или другой подтверждённый набор, включая поведение `/v1/users` при недостаточных правах.
- [x] Получить redacted fixtures реальных ответов `/v1/me`, `/v1/guide`, `/v1/deals`, `/v1/deals/search`, `/v1/deals/aggregate`, `/v1/deal-categories`, `/v1/statuses`, `/v1/users`, `/v1/currencies`.
- [x] Составить таблицу маппинга внешних полей VibeCode API во внутренние модели `Deal`, `DealCategory`, `Stage`, `User`, `Currency`.
- [x] Проверить синтаксис фильтров `/v1/deals`, `/v1/deals/search`, `/v1/deals/aggregate` для `categoryId`, дат, `stageSemanticId`, `currency`, сортировки и pagination.
- [x] Проверить доступное поведение aggregate `meta`; зафиксировать, что natural `meta.truncated=true` fixture не получен и для Phase 4 нужен synthetic/large-dataset test.
- [x] Зафиксировать error codes VibeCode API для отсутствующей/истёкшей сессии, недостаточных scopes, access denied, rate limits и upstream failures.
- [x] Подтвердить timezone портала и формат дат, который принимает VibeCode API.
- [x] Проверить требования Black Hole: Node.js runtime, env secrets, healthcheck, logs, rollback, HTTPS, request timeout.
- [x] Из `b24-ai-starter/` выбрать только применимые паттерны: auth/session, env validation, security headers, deployment scripts, log redaction.
- [x] Из `templates-dashboard-vue/` и текущего `dashboard-app/` выбрать reusable frontend-паттерны: B24 layout, navbar/toolbar, локализация, icons, table/chart style, skeleton.
- [x] Провести license-аудит текущих frontend-зависимостей и планируемых backend-зависимостей.

**Критерии готовности:**
- `docs/07-research-results.md` закрывает вопросы из `docs/03-research-brief.md`.
- `docs/07-api-contracts.md` содержит подтверждённые endpoint contracts, filters, errors и mapping.
- `docs/07-reference-audit.md` явно перечисляет, какие reference-паттерны можно использовать, а какие нельзя переносить в production.
- `docs/fixtures/vibecode/` содержит обезличенные fixtures без токенов, ФИО, email, телефонов, реальных названий сделок и коммерческих сумм.
- Документирована backend-only session/bootstrap модель, а неподтвержденная gateway transport detail вынесена в explicit Phase 2/Phase 10 verification prerequisite.
- Подтверждён production-набор scopes и deployment topology.

**Тесты:**
- Ручной smoke `GET /v1/me` диагностическим ключом только вне пользовательского MVP.
- Ручная проверка fixtures на отсутствие секретов и персональных данных.
- License-аудит `dashboard-app/package.json`, `dashboard-app/pnpm-lock.yaml` и будущего `backend/package.json`.

**Риски:**
- Неверный перенос reference-кода может внести demo-поведение в production.
- Без подтверждённого session protocol backend может ошибочно принять небезопасную модель авторизации.
- Фактический контракт API может отличаться от `amount/currency/createdAt/closedAt`, поэтому mapper нельзя писать по предположениям.
- Scopes `user` и `user_brief` конфликтуют в документах; ошибочный scope сломает установку или имена ответственных.

**Статус Phase 0 от 2026-07-22:**
- Сделано: создан research report, API contract report, reference audit; получены и обезличены fixtures VibeCode; подтверждены `GET /v1/deals`, `POST /v1/deals/search`, `POST /v1/deals/aggregate`, `$gte`/`$lte` date filters, available aggregate meta, минимальные scopes `crm,user_brief`, timezone fallback через `/v1/users.timeZone`, Black Hole `node20` topology notes, reusable frontend/backend reference patterns и direct dependency license allowlist.
- Изменены файлы: `docs/06-plan.md`; `docs/07-research-results.md`; `docs/07-api-contracts.md`; `docs/07-reference-audit.md`; `docs/fixtures/vibecode/me.redacted.json`; `docs/fixtures/vibecode/guide.redacted.json`; `docs/fixtures/vibecode/deals.redacted.json`; `docs/fixtures/vibecode/deals-search.redacted.json`; `docs/fixtures/vibecode/deals-aggregate.redacted.json`; `docs/fixtures/vibecode/deal-categories.redacted.json`; `docs/fixtures/vibecode/statuses.redacted.json`; `docs/fixtures/vibecode/users.redacted.json`; `docs/fixtures/vibecode/currencies.redacted.json`; `docs/fixtures/vibecode/errors.redacted.json`.
- Пройдены тесты: ручной smoke `GET /v1/me`; `GET /v1/deals?limit=2`; `POST /v1/deals/search`; `POST /v1/deals/aggregate`; negative smoke missing API key; negative smoke invalid filter operator; negative smoke invalid aggregate groupBy; ручная проверка fixtures на отсутствие `vibe_app_`, `vibe_api_`, `vibe_session_`, `Authorization`, `cookie`, email-like strings and non-redacted deal titles; direct dependency license metadata check via `pnpm view <package> license`.
- Остались follow-up prerequisites для следующих фаз: exact gateway header/cookie/signature for user session was not observable through direct diagnostic API-key calls and must be captured in a real iframe/gateway request before hardening `backend/src/session/context.ts`; naturally truncated aggregate fixture was not available, so `meta.truncated=true` must be synthetic until a large dataset is available; `/v1/deal-categories` and `/v1/users` returned object-shaped data in sampled responses, so Phase 2 schemas must accept object/array until consistency is confirmed; `pnpm licenses list --json` failed because local pnpm store package index files were missing, so transitive license scan remains required after install/store refresh.
- Итог: Phase 0 завершена как research lockdown. Неизвестные детали не блокируют закрытие Phase 0, потому что они задокументированы как обязательные verification gates перед реализацией session hardening и production iframe smoke.

## Phase 1. Backend Scaffold In `backend/`

**Цель:** создать отдельный production BFF в `backend/`, который запускается локально, валидирует env, отдаёт health endpoints и не раскрывает секреты frontend.

**Файлы:**
- Создать: `backend/package.json`
- Создать: `backend/pnpm-lock.yaml`
- Создать: `backend/tsconfig.json`
- Создать: `backend/src/index.ts`
- Создать: `backend/src/config.ts`
- Создать: `backend/src/http/app.ts`
- Создать: `backend/src/http/errors.ts`
- Создать: `backend/src/http/securityHeaders.ts`
- Создать: `backend/src/logging/logger.ts`
- Создать: `backend/src/session/context.ts`
- Создать: `backend/src/types/api.ts`
- Создать: `backend/tests/http/*.test.ts`
- Создать: `backend/.env.example`
- Изменить: `.gitignore`, если нужно исключить backend build/env/log artifacts
- Изменить: `docs/07-reference-audit.md`, если scaffold сознательно отклоняется от reference pattern

**Работы:**
- [x] Выбрать минимальный Node.js HTTP framework или встроенный HTTP runtime после проверки лицензии и поддержки Black Hole.
- [x] Настроить TypeScript, Vitest, lint/typecheck scripts для `backend/`.
- [x] Добавить env validation для `VIBECODE_APP_KEY`, `VIBECODE_API_BASE_URL`, allowed Bitrix24 origins, app public URL, runtime mode и log level.
- [x] Реализовать `GET /health` для liveness без обращения к VibeCode API.
- [x] Реализовать `GET /ready` для проверки конфигурации и готовности backend.
- [x] Добавить централизованный error handler с внутренними кодами `AUTH_REQUIRED`, `SESSION_EXPIRED`, `SCOPE_DENIED`, `CRM_ACCESS_DENIED`, `RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `UPSTREAM_UNAVAILABLE`, `DATA_TRUNCATED`, `VALIDATION_ERROR`, `UNKNOWN`.
- [x] Добавить security headers из спецификации и ограниченный CORS для домена приложения и допустимых Bitrix24 origins.
- [x] Реализовать `session/context` по подтверждённому protocol из Phase 0, не отдавая session token в ответы.
- [x] Настроить graceful shutdown и структурированные логи с маскированием секретов.

**Критерии готовности:**
- `cd backend; pnpm run typecheck` проходит.
- `cd backend; pnpm run test` проходит.
- `GET /health` возвращает 200 без секретов.
- `GET /ready` возвращает 200 при корректном env и понятную ошибку при отсутствующем обязательном env.
- Логи и JSON-ответы не содержат `vibe_app_`, `vibe_api_`, `vibe_session_`, `Authorization` и cookies.
- В `dashboard-app/` не добавлен backend-код.
- В `docs/` нет backend runtime secrets.

**Тесты:**
- Unit: env validation, error mapping, secret redaction, security headers.
- Integration: `/health`, `/ready`, CORS rejection для произвольного origin.
- Security: поиск секретных паттернов в backend responses и test logs.

**Риски:**
- Неподдерживаемый runtime/framework усложнит Black Hole deployment.
- CORS/frame headers можно настроить слишком жёстко и сломать iframe, либо слишком широко и открыть лишние origins.
- Ошибка в session/context может случайно пробросить session token во frontend.

**Статус Phase 1 от 2026-07-22:**
- Сделано: создан отдельный backend scaffold на встроенном `node:http` без production dependencies; добавлены TypeScript/Vitest/ESLint scripts; реализованы env validation, `/health`, `/ready`, централизованные ошибки, iframe-safe security headers без `X-Frame-Options`, CORS allowlist, session context без публичной отдачи token, graceful shutdown, expanded redaction logger и тестируемый Node request adapter без premature body forwarding.
- Изменены файлы: `.gitignore`; `backend/package.json`; `backend/pnpm-lock.yaml`; `backend/tsconfig.json`; `backend/vitest.config.ts`; `backend/eslint.config.js`; `backend/.env.example`; `backend/src/index.ts`; `backend/src/config.ts`; `backend/src/http/app.ts`; `backend/src/http/errors.ts`; `backend/src/http/securityHeaders.ts`; `backend/src/http/nodeRequest.ts`; `backend/src/logging/logger.ts`; `backend/src/session/context.ts`; `backend/src/types/api.ts`; `backend/tests/http/*.test.ts`; `docs/06-plan.md`.
- Пройдены тесты: `cd backend; pnpm run test` (7 files, 12 tests); `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.
- Остались риски: `session/context` остается минимальной header-based заготовкой до real iframe/gateway capture из Phase 0 follow-up prerequisites; CORS/CSP origins требуют проверки в реальном Bitrix24 iframe; Black Hole runtime compatibility подтверждена только выбором dependency-free Node HTTP runtime, без реального deploy smoke.

## Phase 2. Backend VibeCode Client, Schemas And Mappers

**Цель:** изолировать `backend/` от фактического контракта VibeCode API через Zod-схемы, redacted fixtures и явный mapper во внутренние DTO.

**Файлы:**
- Создать: `backend/src/vibecode/client.ts`
- Создать: `backend/src/vibecode/schemas.ts`
- Создать: `backend/src/vibecode/mappers.ts`
- Создать: `backend/src/vibecode/errors.ts`
- Создать: `backend/src/domain/models.ts`
- Создать: `backend/tests/vibecode/*.test.ts`
- Читать: `docs/fixtures/vibecode/*.redacted.json`
- Изменить: `docs/07-api-contracts.md`, если mapper фиксирует новые подтверждённые детали

**Работы:**
- [x] Описать внешние Zod-схемы для `/v1/me`, `/v1/guide`, `/v1/deals`, `/v1/deals/search`, `/v1/deals/aggregate`, `/v1/deal-categories`, `/v1/statuses`, `/v1/users`, `/v1/currencies`.
- [x] Описать внутренние модели `Deal`, `DealCategory`, `Stage`, `User`, `Currency`, `VibeCodeMeta`.
- [x] Реализовать маппинг внешних полей в стабильные внутренние поля `id`, `title`, `amount`, `currency`, `categoryId`, `stageId`, `stageSemanticId`, `assignedById`, `createdAt`, `updatedAt`, `closedAt`.
- [x] Нормализовать ошибки VibeCode API во внутренний enum backend.
- [x] Добавить retry policy только для `429`, `502`, `503`, `504` и timeout; не retry для `400`, `401`, `403`.
- [x] Запретить backend проксировать произвольный VibeCode endpoint из query/body.

**Критерии готовности:**
- Все redacted fixtures из `docs/fixtures/vibecode/` проходят Zod-валидацию.
- Mapper покрывает nullable поля и альтернативные имена полей, подтверждённые Phase 0.
- Ошибки VibeCode API стабильно преобразуются в backend error codes.
- VibeCode client всегда добавляет `X-Api-Key` и пользовательский `Authorization` только на сервере.

**Тесты:**
- Contract: fixtures каждого endpoint проходят parse и mapping.
- Unit: retry только для разрешённых кодов.
- Unit: `stageSemanticId` nullable, `amount` number/string, `currency` nullable.
- Security: responses и thrown errors не включают ключи, session token и raw upstream body с персональными данными.

**Риски:**
- Fixtures могут быть неполными и не покрыть редкие nullable/legacy поля.
- Ошибки upstream могут иметь нестабильный формат.
- Retry без лимитов может усилить rate limit, поэтому нужны малое число попыток и timeout.

**Статус Phase 2 от 2026-07-22:**
- Сделано: добавлена dependency `zod`; реализованы внешние VibeCode schemas, внутренние domain models, mappers, error normalization и закрытый VibeCode client с фиксированными методами для разрешенных endpoints; client добавляет `X-Api-Key` и optional server-side `Authorization`, применяет timeout и retry только для retryable upstream failures; покрыты error fixtures, invalid success schema normalization, timeout retry и typed request bodies.
- Изменены файлы: `backend/package.json`; `backend/pnpm-lock.yaml`; `backend/src/domain/models.ts`; `backend/src/vibecode/client.ts`; `backend/src/vibecode/schemas.ts`; `backend/src/vibecode/mappers.ts`; `backend/src/vibecode/errors.ts`; `backend/tests/vibecode/*.test.ts`; `docs/06-plan.md`.
- Пройдены тесты: `cd backend; pnpm run test` (11 files, 27 tests); `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.
- Остались риски: fixtures остаются ограниченной выборкой и не покрывают все nullable/legacy варианты; exact gateway session transport все еще ждет real iframe capture из Phase 0 follow-up prerequisites; timeout/retry policy покрыта unit behavior, но реальные latency/rate-limit параметры нужно проверить на production-like VibeCode calls.

## Phase 3. Backend Reference Data And Bootstrap API

**Цель:** реализовать загрузку справочников, cache policy и дефолтные фильтры для `GET /api/bootstrap`.

**Файлы:**
- Создать: `backend/src/services/referenceDataService.ts`
- Создать: `backend/src/services/cache.ts`
- Создать: `backend/src/http/routes/bootstrap.ts`
- Создать: `backend/tests/services/referenceDataService.test.ts`
- Создать: `backend/tests/http/bootstrap.test.ts`
- Изменить: `backend/src/http/app.ts`
- Изменить: `backend/src/types/api.ts`

**Работы:**
- [x] Загрузить `/v1/deal-categories`, `/v1/statuses`, `/v1/currencies`, `/v1/users`.
- [x] Для основной воронки использовать `filter[entityId]=DEAL_STAGE`; для дополнительных `filter[entityId]=DEAL_STAGE_<categoryId>`.
- [x] Кэшировать справочники с TTL: воронки 10 минут, стадии 10 минут, валюты 30-60 минут, пользователи 5-10 минут.
- [x] Использовать cache key с portal scope: `categories:{portalId}`, `stages:{portalId}:{categoryId}`, `currencies:{portalId}`, `users:{portalId}`.
- [x] Выбрать дефолтную воронку `categoryId = 0`, если доступна; иначе первую доступную.
- [x] Вернуть дефолтный период: последние 30 календарных дней, включая текущий день в timezone портала.
- [x] Вернуть дефолтную валюту `all`.
- [x] При недоступности `/v1/users` вернуть warning и разрешить dashboard работать с `assignedById`.

**Критерии готовности:**
- `GET /api/bootstrap` возвращает справочники, timezone, defaults и warnings.
- Отсутствие users scope не блокирует bootstrap.
- Пустой список доступных воронок возвращает блокирующую ошибку доступа/данных.
- Cache TTL и keys покрыты тестами.

**Тесты:**
- Integration: успешный bootstrap с основной воронкой.
- Integration: bootstrap выбирает первую доступную воронку, если `categoryId = 0` отсутствует.
- Integration: users недоступны, bootstrap содержит warning `USERS_UNAVAILABLE`.
- Unit: cache hit/miss, TTL expiration, portal-scoped keys.

**Риски:**
- Справочник стадий может отличаться по entityId между порталами.
- Shared cache без portal key может смешать данные разных порталов.
- Недоступность users нельзя трактовать как полный отказ dashboard.

**Статус Phase 3 от 2026-07-22:**
- Сделано: реализованы in-memory TTL cache, reference data service, `GET /api/bootstrap` route и wiring в backend app; bootstrap загружает categories, stages, currencies, users, выбирает default category, считает 30-day default period в timezone пользователя/UTC fallback, возвращает default currency `all`, требует session token и portal id до загрузки данных, возвращает warning `USERS_UNAVAILABLE` только для неблокирующих users failures и не падает на invalid user timezone.
- Изменены файлы: `backend/src/services/cache.ts`; `backend/src/services/referenceDataService.ts`; `backend/src/http/routes/bootstrap.ts`; `backend/src/http/app.ts`; `backend/src/types/api.ts`; `backend/tests/services/cache.test.ts`; `backend/tests/services/referenceDataService.test.ts`; `backend/tests/http/bootstrap.test.ts`; `docs/06-plan.md`.
- Пройдены тесты: `cd backend; pnpm run test` (14 files, 37 tests); `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.
- Остались риски: timezone берется из первого валидного пользователя с `timeZone` или `UTC`, потому что отдельный portal timezone endpoint не подтвержден; bootstrap route пока использует provisional header-based session context до real iframe/gateway capture; cache in-memory и сбрасывается при restart/scale-out.

## Phase 4. Backend Date Adapter, Filters And Query Builder

**Цель:** корректно рассчитать периоды в timezone портала и построить VibeCode queries для dashboard-данных.

**Файлы:**
- Создать: `backend/src/services/dateAdapter.ts`
- Создать: `backend/src/services/filterValidation.ts`
- Создать: `backend/src/services/dealsQueryService.ts`
- Создать: `backend/tests/services/dateAdapter.test.ts`
- Создать: `backend/tests/services/filterValidation.test.ts`
- Создать: `backend/tests/services/dealsQueryService.test.ts`
- Изменить: `backend/src/types/api.ts`

**Работы:**
- [x] Реализовать presets: `last7`, `last30`, `last90`, `currentMonth`, `previousMonth`, `custom`.
- [x] Хранить входные `dateFrom`/`dateTo` как календарные даты `YYYY-MM-DD`.
- [x] Рассчитывать начало дня включительно и конец дня включительно в timezone портала.
- [x] Запретить прямое использование `new Date('YYYY-MM-DD')` для бизнес-границ.
- [x] Валидировать `categoryId`, `dateFrom`, `dateTo`, `currency=all|<code>`.
- [x] Построить запросы для KPI: open now без `createdAt`, open created by `createdAt`, won by `closedAt`, funnel by `createdAt`, trend by `createdAt`/`closedAt`.
- [x] Построить отдельный query для recent deals: выбранная воронка, период по `createdAt`, валюта, `createdAt desc`, limit 15.

**Критерии готовности:**
- Невалидные фильтры возвращают `400 INVALID_FILTERS`.
- Периоды на границах месяца и года рассчитываются в timezone портала.
- Query builder не использует unsupported filters из Phase 0.
- Recent deals query отделён от aggregate queries.

**Тесты:**
- Unit: все presets на фиксированной дате.
- Unit: leap year, month/year boundary, DST-relevant timezone, если применимо.
- Unit: invalid date range, unknown currency, invalid categoryId.
- Unit: query payloads для open now, created, won, funnel, trend, recent deals.

**Риски:**
- Ошибка timezone даст неправильные KPI на границах дней.
- API может иначе трактовать включительность `dateTo`.
- В будущем custom range может стать слишком широким и часто вызывать truncation.

**Статус Phase 4 от 2026-07-22:**
- Сделано: реализованы timezone-aware date adapter для presets `last7`, `last30`, `last90`, `currentMonth`, `previousMonth`, `custom`; добавлена validation входных dashboard filters с `INVALID_FILTERS`, включая reject пустого/blank `categoryId` и невозможных календарных дат; построены query payloads для open now, open created, won, funnel, ограниченных trend created/won и separate recent deals query; VibeCode request schemas расширены `closedAt` date filter.
- Изменены файлы: `backend/src/services/dateAdapter.ts`; `backend/src/services/filterValidation.ts`; `backend/src/services/dealsQueryService.ts`; `backend/src/types/api.ts`; `backend/src/http/errors.ts`; `backend/src/vibecode/errors.ts`; `backend/src/vibecode/schemas.ts`; `backend/tests/services/dateAdapter.test.ts`; `backend/tests/services/filterValidation.test.ts`; `backend/tests/services/dealsQueryService.test.ts`; `docs/06-plan.md`.
- Пройдены тесты: `cd backend; pnpm run test` (17 files, 52 tests); `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.
- Остались риски: VibeCode inclusivity for `closedAt`/`createdAt` boundaries still needs production-like smoke; very wide custom ranges may need additional UX cap in later phases; timezone conversion relies on runtime `Intl` timezone data.

## Phase 4.5. Backend Session Boundary Hardening Gate

**Цель:** закрыть security findings независимого аудита Phase 0-4 до реализации `GET /api/dashboard`, чтобы Phase 5 не строилась поверх доверия к неподписанным клиентским заголовкам.

**Файлы:**
- Изменить: `backend/src/session/context.ts`
- Изменить: `backend/src/http/routes/bootstrap.ts`
- Изменить: `backend/src/services/referenceDataService.ts`
- Изменить: `backend/tests/http/sessionContext.test.ts`
- Изменить: `backend/tests/http/bootstrap.test.ts`
- Изменить: `backend/tests/services/referenceDataService.test.ts`
- Создать: `docs/07-session-boundary-report.md`
- Изменить: `docs/07-research-results.md`, если real iframe/gateway capture уточняет контракт

**Работы:**
- [x] Провести local feasibility check для real Bitrix24 iframe/gateway capture; прямой capture недоступен из локального контекста, поэтому зафиксировать signed gateway handoff contract и residual external verification risk.
- [x] Описать, какие inbound headers считаются trusted, какие являются только dev/provisional, и где backend получает portal/user/session в production.
- [x] Заменить production session parsing так, чтобы неподписанные client-supplied `Authorization`, `X-Bitrix24-Domain`, `X-Bitrix24-User-Id` не принимались как достаточная аутентификация.
- [x] Добавить negative tests на forged headers: произвольный bearer token, подмена portal domain, подмена user id, отсутствие/битая подпись или handoff marker.
- [x] Уточнить cache key для справочников: добавить user/session dimension для user-specific данных, когда `userId` доступен.
- [x] Проверить, что `GET /api/bootstrap` не раскрывает данные другого пользователя при смене session context внутри одного portal.
- [x] Обновить документацию с итоговым решением и residual risks.

**Критерии готовности:**
- Backend принимает production session context только из подтверждённого gateway/session handoff.
- Forged client headers не дают успешный `/api/bootstrap`.
- Cache isolation соответствует подтверждённому контракту VibeCode или включает user/session dimension там, где данные могут зависеть от прав пользователя.
- Все временные header-based тесты явно помечены как dev/provisional либо заменены production negative tests.
- Critical/High finding про session boundary и Important finding про reference cache isolation закрыты или перенесены в явно утверждённый residual risk.

**Тесты:**
- Unit/HTTP: forged `Authorization` без valid handoff возвращает `AUTH_REQUIRED` или `SESSION_EXPIRED`.
- Unit/HTTP: forged `X-Bitrix24-Domain` не меняет portal namespace без valid handoff.
- Unit/HTTP: forged `X-Bitrix24-User-Id` не меняет user context без valid handoff.
- Unit/service: reference cache не возвращает user-specific data между разными users одного portal.
- Full backend gate: `cd backend; pnpm run test`; `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.

**Риски:**
- Точный handoff contract может зависеть от реального Bitrix24 placement/runtime и не быть воспроизводимым через direct API-key diagnostics.
- Если VibeCode не отдаёт проверяемую подпись/маркер, понадобится отдельное архитектурное решение до Phase 5.

**Статус Phase 4.5 от 2026-07-23:**
- Сделано: добавлен `SESSION_CONTEXT_MODE` (`signed-headers`/`provisional-headers`) и обязательный `SESSION_CONTEXT_HMAC_SECRET` для signed mode; production session parser принимает только HMAC-signed gateway handoff headers; legacy `Authorization` + `X-Bitrix24-*` headers оставлены только для provisional dev/test mode; `/api/bootstrap` передает `userId` в reference service; reference cache изолируется по `portalId:user:userId`, когда user context доступен; добавлены negative tests на forged headers и user-specific cache isolation; создан `docs/07-session-boundary-report.md`.
- Изменены файлы: `backend/.env.example`; `backend/src/config.ts`; `backend/src/http/app.ts`; `backend/src/http/routes/bootstrap.ts`; `backend/src/http/securityHeaders.ts`; `backend/src/services/referenceDataService.ts`; `backend/src/session/context.ts`; `backend/tests/http/bootstrap.test.ts`; `backend/tests/http/config.test.ts`; `backend/tests/http/sessionContext.test.ts`; `backend/tests/services/referenceDataService.test.ts`; `docs/06-plan.md`; `docs/07-session-boundary-report.md`.
- Пройдены тесты: `cd backend; pnpm vitest run tests/http/sessionContext.test.ts tests/http/bootstrap.test.ts tests/services/referenceDataService.test.ts tests/http/config.test.ts` (4 files, 17 tests); `cd backend; pnpm run test` (17 files, 57 tests); `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.
- Остались риски: real Bitrix24 iframe/gateway capture не выполнен локально и должен подтвердить, что runtime может выпускать `signed-headers` или эквивалентный проверяемый handoff; HMAC signed headers защищают от forged client headers только при условии, что `SESSION_CONTEXT_HMAC_SECRET` остается server-only и gateway/proxy не пропускает клиенту возможность подписывать handoff самостоятельно.

## Phase 5. Backend Aggregation And Dashboard API

**Цель:** после закрытия Phase 4.5 реализовать `GET /api/dashboard`, KPI, воронку по стадиям, тренд, таблицу последних сделок и warnings.

**Файлы:**
- Создать: `backend/src/services/aggregationService.ts`
- Создать: `backend/src/http/routes/dashboard.ts`
- Создать: `backend/tests/services/aggregationService.test.ts`
- Создать: `backend/tests/http/dashboard.test.ts`
- Изменить: `backend/src/http/app.ts`
- Изменить: `backend/src/types/api.ts`
- Изменить: `docs/07-api-contracts.md`, если финальные DTO уточняются

**Работы:**
- [x] Перед началом убедиться, что Phase 4.5 закрыта или пользователь явно утвердил documented residual risk.
- [x] Рассчитать KPI: «Открыто сейчас», «Открыто из созданных за период», «Выиграно за период», «Сумма выигранных за период», «Средний чек».
- [x] Для денег возвращать суммы по валютам; при `currency=all` не объединять валюты.
- [x] Сделки без суммы считать с `amount = 0`.
- [x] Сделки без валюты учитывать в количестве и исключать из денежных сумм с warning `INCOMPLETE_FINANCIAL_DATA`.
- [x] Классифицировать сделки по `stageSemanticId`, fallback из `Stage.semantics`; при неизвестной семантике вернуть warning `UNKNOWN_STAGE_SEMANTICS`.
- [x] Построить воронку по всем стадиям выбранной воронки, включая нулевые стадии, со `share`, `amountsByCurrency`, `sort`, `color`.
- [x] Построить trend по созданным и выигранным сделкам с группировкой по дням, неделям или месяцам по длине периода.
- [x] Вернуть recent deals limit 15, `createdAt desc`, `assignedName` или fallback на `assignedById`.
- [x] При `meta.truncated=true` вернуть warning `PARTIAL_AGGREGATION` и пометить затронутые блоки в `meta`.
- [x] Разделить блокирующие ошибки и частичные warnings.

**Критерии готовности:**
- `GET /api/dashboard` возвращает `DashboardResponse` с `filters`, `references`, `kpi`, `stageFunnel`, `trend`, `recentDeals`, `warnings`, `meta`.
- Воронка всегда содержит все стадии выбранной воронки.
- Таблица recent deals не зависит от усечённой агрегации.
- Пустые данные возвращают валидный пустой dashboard, а не ошибку, если доступ есть.
- Backend не вызывает write-методы CRM.

**Тесты:**
- Unit: расчёт KPI по смешанным P/S/F сделкам.
- Unit: multi-currency суммы отдельными группами.
- Unit: average won deal amount равен `0` без выигранных сделок.
- Unit: сделки без валюты и без суммы.
- Unit: stages with zero counts остаются в funnel.
- Unit: trend grouping для 7/30/90/custom дней.
- Integration: `/api/dashboard` применяет category/date/currency filters.
- Integration: users unavailable даёт fallback и warning.
- Integration: expired session даёт `SESSION_EXPIRED`.
- Integration: retry policy не применяется к `400`, `401`, `403`.

**Риски:**
- `/v1/deals/aggregate` может не поддерживать нужную группировку в одном запросе; тогда потребуется несколько запросов или частичный список.
- `meta.truncated=true` делает KPI предварительными, это обязательно должно быть явно видно.
- Неверное разделение blocking errors и warnings может скрыть полезные данные.

**Статус Phase 5 от 2026-07-23:**
- Сделано: реализован `GET /api/dashboard`; добавлен `DashboardResponse`; создан pure aggregation service для KPI, per-currency money, average won amount, stage funnel, trend, recent deals, warnings и meta; dashboard route применяет session boundary Phase 4.5, bootstrap references, filter validation, timezone date range, Phase 4 query builder и VibeCode search/aggregate calls; `docs/07-api-contracts.md` уточнён BFF dashboard contract.
- Изменены файлы: `backend/src/services/aggregationService.ts`; `backend/src/http/routes/dashboard.ts`; `backend/src/http/app.ts`; `backend/src/types/api.ts`; `backend/src/services/dealsQueryService.ts`; `backend/tests/services/aggregationService.test.ts`; `backend/tests/http/dashboard.test.ts`; `backend/tests/services/dealsQueryService.test.ts`; `docs/06-plan.md`; `docs/07-api-contracts.md`.
- Пройдены тесты: `cd backend; pnpm vitest run tests/services/aggregationService.test.ts tests/http/dashboard.test.ts tests/services/dealsQueryService.test.ts` (3 files, 10 tests); `cd backend; pnpm run test` (19 files, 65 tests); `cd backend; pnpm run typecheck`; `cd backend; pnpm run lint`; `cd backend; pnpm run build`.
- Остались риски: monetary KPI считаются из bounded search results (`limit=500`) из-за неподтверждённого `groupBy: currency` в aggregate API; если bounded search достигает limit, backend возвращает `PARTIAL_AGGREGATION`, но production-like smoke и windowing всё ещё нужны для широких диапазонов; real VibeCode inclusivity for `createdAt`/`closedAt` boundaries всё ещё требует smoke; frontend пока не использует `/api/dashboard` до Phase 6.

## Phase 6. Frontend API Layer In `dashboard-app/`

**Цель:** перевести `dashboard-app/` с demo/mock/прямых CRM-расчётов на безопасные DTO из `backend/`.

**Файлы:**
- Создать: `dashboard-app/src/api/dashboardApi.ts`
- Создать: `dashboard-app/src/types/dashboard.ts`
- Создать: `dashboard-app/src/composables/useSalesDashboard.ts`
- Создать: `dashboard-app/src/composables/useSalesDashboard.test.ts`
- Создать: `dashboard-app/src/mocks/dashboard.ts`
- Изменить: `dashboard-app/src/composables/useDealStats/*` или удалить после миграции, если больше не используется
- Изменить: `dashboard-app/src/pages/index.vue`
- Изменить: `dashboard-app/.env.example`
- Изменить: `docs/07-api-contracts.md`, если frontend выявит проблему DTO

**Работы:**
- [x] Описать frontend DTO, совпадающие с `DashboardResponse` backend.
- [x] Реализовать `getBootstrap()` и `getDashboard(filters)` только через `/api/bootstrap` и `/api/dashboard`.
- [x] Добавить локальный dev/mock режим без production-секретов и без обращения к reference-папкам.
- [x] Реализовать state machine: initial loading, ready, refreshing, empty, blocking error, partial warnings.
- [x] При быстрой смене фильтров показывать только результат последнего запроса.
- [x] Не очищать весь экран при refresh; старые данные можно приглушать до завершения нового запроса.
- [x] Не сохранять session token в `localStorage`, `sessionStorage`, query string или frontend state.

**Критерии готовности:**
- Frontend не вызывает VibeCode API и Bitrix24 CRM REST напрямую для данных дашборда.
- Все данные дашборда приходят из backend DTO.
- Mock/dev режим работает локально без Bitrix24 iframe.
- При смене фильтров нет смешивания старого и нового набора данных.
- `templates-dashboard-vue/` не импортируется и не участвует в сборке.

**Тесты:**
- Unit: `useSalesDashboard` initial loading -> ready.
- Unit: refresh keeps previous data but marks refreshing.
- Unit: stale request ignored when newer request completes first.
- Unit: warning mapping.
- Security: поиск `vibe_app_`, `vibe_api_`, `vibe_session_` в built frontend bundle.

**Риски:**
- Существующий `useDealStats` завязан на Bitrix24 SDK и может потребовать аккуратной миграции, чтобы не сломать локальный режим.
- Race conditions при фильтрах легко дают смешанные KPI/table.
- Mock-данные не должны становиться production fallback при ошибке backend.

**Статус Phase 6 от 2026-07-23:**
- Сделано: добавлен frontend DTO/API слой для `/api/bootstrap` и `/api/dashboard`; реализован локальный mock mode через `VITE_DASHBOARD_MOCK_MODE`; добавлен `useSalesDashboard` со state machine `initial/loading/ready/refreshing/empty/error`, stale request guard, сохранением предыдущих данных при refresh и mapping warnings; главная страница переведена с `useDealStats` на backend DTO без хранения session token во frontend state/storage/query; API-клиент нормализует non-JSON/empty backend errors; initial state считается первичной загрузкой без показа нулевых KPI до первого ответа; временные dashboard labels и warning titles приведены к читаемым текстам.
- Изменены файлы: `dashboard-app/.env.example`; `dashboard-app/src/api/dashboardApi.ts`; `dashboard-app/src/api/dashboardApi.test.ts`; `dashboard-app/src/components/UserMenu.vue`; `dashboard-app/src/composables/useSalesDashboard.ts`; `dashboard-app/src/composables/useSalesDashboard.test.ts`; `dashboard-app/src/layouts/default.vue`; `dashboard-app/src/mocks/dashboard.ts`; `dashboard-app/src/pages/index.vue`; `dashboard-app/src/types/dashboard.ts`; `docs/06-plan.md`.
- Пройдены тесты: `cd dashboard-app; pnpm vitest run src/api/dashboardApi.test.ts src/composables/useSalesDashboard.test.ts` (2 files, 11 tests); `cd dashboard-app; pnpm run test` (6 files, 42 tests); `cd dashboard-app; pnpm run typecheck`; `cd dashboard-app; pnpm run lint`; `cd dashboard-app; pnpm run build`; `rg -n "vibe_app_|vibe_api_|vibe_session_" dashboard-app/dist` (совпадений нет); `rg -n "templates-dashboard-vue" dashboard-app/dist` (совпадений нет).
- Остались риски: UI главной страницы пока минимально отображает DTO и всё ещё содержит старые demo actions/navigation, полноценная замена на dashboard components запланирована в Phase 7; старые home-компоненты и `useDealStats` остаются в кодовой базе, но больше не используются `src/pages/index.vue`; production smoke с реальным backend/iframe не выполнялся в этой фазе.

## Phase 7. Frontend Dashboard UI In `dashboard-app/`

**Цель:** собрать рабочий экран dashboard по UI brief: фильтры, KPI, предупреждения, funnel, trend, recent deals и все состояния.

**Файлы:**
- Создать: `dashboard-app/src/components/dashboard/DashboardFilters.vue`
- Создать: `dashboard-app/src/components/dashboard/KpiCards.vue`
- Создать: `dashboard-app/src/components/dashboard/StageFunnel.vue`
- Создать: `dashboard-app/src/components/dashboard/TrendChart.vue`
- Создать: `dashboard-app/src/components/dashboard/RecentDealsTable.vue`
- Создать: `dashboard-app/src/components/dashboard/DashboardWarnings.vue`
- Создать: `dashboard-app/src/components/dashboard/DashboardEmptyState.vue`
- Создать: `dashboard-app/src/components/dashboard/DashboardErrorState.vue`
- Создать: `dashboard-app/src/components/dashboard/DashboardSkeleton.vue`
- Создать: `dashboard-app/src/components/dashboard/__tests__/*.test.ts`
- Изменить: `dashboard-app/src/pages/index.vue`
- Изменить: `dashboard-app/src/assets/css/main.css`
- Изменить: `dashboard-app/src/locales/ru.json`

**Работы:**
- [x] Убрать с главного dashboard шаблонные действия, не входящие в MVP: feedback, add mail, add customer.
- [x] Добавить заголовок «Дашборд воронки продаж» и вторичную строку с выбранной воронкой, периодом и timezone портала.
- [x] Добавить фильтр воронки, периода и валюты; не показывать «Все воронки».
- [x] Добавить refresh icon button.
- [x] Отобразить 5 KPI-карточек с корректными денежными списками по валютам.
- [x] Реализовать `StageFunnel.vue` как собственный Vue/SVG или HTML/SVG-компонент без тяжёлой новой библиотеки.
- [x] Реализовать `TrendChart.vue` на Unovis.
- [x] Реализовать `RecentDealsTable.vue` на TanStack Table, 15 строк, `createdAt desc`, fallback `assignedById`.
- [x] Открывать карточку сделки по клику через Bitrix24 SDK или доступный `dealUrl`; не показывать write actions.
- [x] Показать warnings: partial aggregation, incomplete financial data, missing users, unknown stage semantics.
- [x] Реализовать skeleton, empty dashboard, no recent deals, no stages, access/session/errors.
- [x] Проверить адаптивность: широкая, средняя и узкая ширина iframe; без горизонтального scroll страницы, кроме внутреннего scroll таблицы.
- [x] Сохранить полезные Bitrix24 UI-паттерны из текущего `dashboard-app/` и reference `templates-dashboard-vue/`, но не оставлять demo-контент.
- [x] Соблюсти визуальный стиль: рабочий плотный интерфейс, светлая нейтральная тема, карточки без вложенных карточек, без hero/маркетинговых блоков.

**Критерии готовности:**
- Основной экран соответствует структуре из `docs/05-ui-brief.md`.
- Дефолтные фильтры: основная доступная воронка, последние 30 календарных дней, «Все валюты».
- KPI, funnel, chart и table обновляются по активным фильтрам.
- Empty/warning/error состояния имеют конкретные русские сообщения без raw stack traces.
- UI читаем в iframe на широкой, средней и узкой ширине.

**Тесты:**
- Component: фильтры меняют model и вызывают refresh.
- Component: KPI показывает несколько валют отдельными строками.
- Component: funnel показывает нулевые стадии.
- Component: recent deals fallback на `assignedById`.
- Component/UI: warnings видимы и не блокируют данные.
- Manual/Playwright: desktop iframe width, medium iframe width, narrow iframe width; нет наложений текста и горизонтального scroll страницы.

**Риски:**
- Слишком плотный UI может потерять читаемость на узком iframe.
- График и funnel могут иметь нечитаемые подписи при длинных названиях стадий.
- Bitrix24 UI components могут иметь ограничения по date range/custom picker.

**Статус Phase 7 от 2026-07-23:**
- Сделано: главный экран `dashboard-app/src/pages/index.vue` заменён на read-only sales funnel dashboard без template write/demo actions; добавлены фильтры воронки/периода/валюты, refresh, заголовок и контекст активных фильтров; добавлены KPI, warnings, funnel, trend chart, recent deals table, skeleton, empty/no-data/error states.
- Изменены файлы: `dashboard-app/src/pages/index.vue`, `dashboard-app/src/assets/css/main.css`, `dashboard-app/src/locales/ru.json`; созданы `dashboard-app/src/components/dashboard/DashboardFilters.vue`, `KpiCards.vue`, `StageFunnel.vue`, `TrendChart.vue`, `RecentDealsTable.vue`, `DashboardWarnings.vue`, `DashboardEmptyState.vue`, `DashboardErrorState.vue`, `DashboardSkeleton.vue`, `dashboardViewModel.ts`, `__tests__/dashboardViewModel.test.ts`; обновлён этот план.
- Пройдены тесты: TDD RED подтверждён падением нового `dashboardViewModel.test.ts` до реализации; затем `pnpm vitest run src/components/dashboard/__tests__/dashboardViewModel.test.ts` — 5/5; `pnpm run test` — 47/47; `pnpm run typecheck`; `pnpm run lint`; `pnpm run build`.
- Остались риски: Playwright/manual iframe screenshots не выполнены, потому что в `dashboard-app` нет установленного Playwright runner; адаптивность проверена кодом/CSS и сборкой, но требует визуального smoke на широкой, средней и узкой iframe-ширине в Phase 8/9. Build проходит с существующими Rollup warnings по `@vueuse/core` pure annotations и chunk size > 500 kB; это не блокирует Phase 7, но должно учитываться в Phase 9 quality gates.

**Статус исправлений ревью Phase 7 от 2026-07-23:**
- Исправлено: `DashboardFilters.vue` больше не содержит implicit `any` в template handlers; custom period не запускает refresh до валидного диапазона и получил явную кнопку «Применить»; денежные KPI показывают первое значение валюты крупно и остальные валюты отдельными строками; технический текст таблицы заменён пользовательским; форматирование и filter-model логика вынесены из `dashboardViewModel.ts` в отдельные helper-модули.
- Добавлены/изменены проверки: `dashboardViewModel.test.ts` теперь покрывает поведение refresh для обычных фильтров, ожидание валидных custom dates и новый вид денежных KPI.
- Пройдены тесты после исправлений: `pnpm vitest run src/components/dashboard/__tests__/dashboardViewModel.test.ts` — 6/6; `pnpm run typecheck`.
- Остались риски: Vue-компоненты всё ещё не покрыты mount/render тестами, потому что в `dashboard-app` нет `@vue/test-utils`/Playwright runner; визуальный smoke iframe и browser-level component tests остаются задачей Phase 8/9.

## Phase 8. Cross-App Local Integration

**Цель:** связать `dashboard-app/` и `backend/` локально без деплоя, чтобы проверить реальные frontend-backend контракты.

**Файлы:**
- Создать: `docs/08-local-integration.md`
- Изменить: `dashboard-app/vite.config.ts`
- Изменить: `dashboard-app/package.json`
- Изменить: `backend/package.json`
- Изменить: root `package.json` только если нужен единый workspace/script на уровне репозитория

**Работы:**
- [x] Настроить Vite proxy `/api/*` из `dashboard-app/` в локальный `backend/`.
- [x] Настроить CORS backend для локального dev origin.
- [x] Добавить документированный локальный запуск: backend port, frontend port, env без secrets в репозитории.
- [x] Проверить `GET /api/bootstrap` и `GET /api/dashboard` из frontend dev server.
- [x] Зафиксировать в `docs/08-local-integration.md` команды запуска, env keys без значений, known local limitations.

**Критерии готовности:**
- Локально можно запустить `backend/` и `dashboard-app/` одновременно.
- Frontend получает данные через `/api/*` без прямого VibeCode endpoint.
- Документация локального запуска лежит в `docs/`, не в app/backend.

**Тесты:**
- Manual: открыть frontend dev URL, проверить bootstrap/dashboard.
- Integration: mock backend responses для frontend.
- Security: dev proxy не раскрывает `VIBECODE_APP_KEY` в browser network payload.

**Риски:**
- Dev proxy может замаскировать production CORS/frame issues.
- Локальный mock context может отличаться от VibeCode Gateway.
- Root workspace scripts могут добавить лишнюю сложность, если их сделать раньше необходимости.

**Статус Phase 8 от 2026-07-23:**
- Сделано: добавлен Vite proxy `/api` из `dashboard-app` в локальный backend с target по умолчанию `http://127.0.0.1:3000`; добавлен dev-only CORS env `LOCAL_FRONTEND_ALLOWED_ORIGINS`, который игнорируется в production; добавлены `dev:local` scripts для backend/frontend; создана инструкция локального запуска и smoke-проверок.
- Изменены файлы: `backend/src/config.ts`, `backend/.env.example`, `backend/package.json`, `backend/tests/http/app.test.ts`, `backend/tests/http/config.test.ts`, `backend/tests/http/dashboard.test.ts`, `backend/tests/http/localIntegration.test.ts`, `dashboard-app/vite.config.ts`, `dashboard-app/package.json`, `dashboard-app/src/config/devProxy.ts`, `dashboard-app/src/config/devProxy.test.ts`, `docs/08-local-integration.md`, `docs/06-plan.md`. Root `package.json` не менялся.
- Пройдены тесты и проверки: `backend` full `pnpm run test`; `dashboard-app` full `pnpm run test`; `pnpm run typecheck`, `pnpm run lint`, `pnpm run build` в `backend/` и `dashboard-app/`; manual smoke через frontend dev server: `GET /api/bootstrap` и `GET /api/dashboard` вернули JSON `401 AUTH_REQUIRED` от backend через Vite proxy без реальной VibeCode-сессии.
- Остались риски: smoke не подтверждает реальные dashboard data без валидной VibeCode session; Vite proxy не заменяет production CORS/frame validation; frontend browser/network security проверена smoke-уровнем, без Playwright.

## Phase 8.5. Security And Production Readiness Hardening

**Цель:** закрыть audit findings после Phase 0-8 до запуска Phase 9 quality gates, чтобы Phase 9 проверяла уже production-ориентированную архитектуру, а не известные design gaps.

**Файлы:**
- Изменить: `backend/src/session/context.ts`
- Изменить: `backend/tests/http/sessionContext.test.ts`
- Изменить: `backend/tests/http/dashboard.test.ts`, если signed-mode сценарии требуют обновления
- Изменить: `backend/.env.example` и/или создать production-safe env documentation в `docs/`
- Изменить: `backend/src/services/dealsQueryService.ts`
- Изменить: `backend/src/services/aggregationService.ts`
- Изменить: `backend/tests/services/*` и `backend/tests/http/dashboard.test.ts`
- Изменить: `dashboard-app/src/composables/useB24.ts`
- Удалить или изолировать: `dashboard-app/src/composables/useDealStats/*`, `dashboard-app/src/components/home/*`, template routes/pages, если они входят в production import graph
- Изменить: `dashboard-app/src/api/dashboardApi.ts`
- Изменить: `dashboard-app/.env.example`
- Создать или обновить: `docs/08.5-hardening-report.md`
- Изменить: `docs/06-plan.md`

**Работы:**
- [x] Добавить freshness защиту signed session handoff: parse/validate `issuedAt`, TTL, clock-skew allowance, negative handling для expired/future/malformed timestamps.
- [x] Явно описать production handoff boundary: кто создает signed headers/cookies, где хранится HMAC secret, какие headers являются trusted, какие user-supplied headers запрещены в production.
- [x] Сделать env examples production-safe или разделить development/production examples, чтобы copy-paste в hosting не включал `SESSION_CONTEXT_MODE=provisional-headers`.
- [x] Перевести monetary KPI на aggregate totals для сумм/средних по валютам и стадиям либо явно отделить partial values в DTO/UI.
- [x] Убрать лишние requested scopes из frontend, оставить только подтвержденный минимум MVP.
- [x] Удалить или скрыть template routes/demo/write-like surfaces из production dashboard surface.
- [x] Удалить старый direct CRM data path (`useDealStats` и связанные home components) из production import graph.
- [x] Запретить `VITE_DASHBOARD_MOCK_MODE=true` в production build/runtime.
- [x] Добавить request/correlation id в backend error responses и logs, frontend должен показывать/хранить его без раскрытия internals.
- [x] Зафиксировать все audit findings, принятые решения, измененные файлы, тесты и оставшиеся external blockers в `docs/08.5-hardening-report.md`.

**Критерии готовности:**
- Signed session headers имеют ограниченное окно действия и negative tests на replay-related cases.
- Production path не зависит от client-supplied provisional auth headers.
- Production env documentation не содержит опасных dev defaults.
- Денежные KPI не выглядят как полные totals, если фактически рассчитаны из частичной выборки.
- Frontend production surface не содержит не-MVP template pages/actions, лишних scopes, mock production mode и direct CRM SDK data calls.
- Backend errors имеют request id, который можно сопоставить с sanitized logs.

**Тесты:**
- Backend unit/integration: valid signed handoff, expired `issuedAt`, future `issuedAt`, malformed `issuedAt`, missing HMAC secret, provisional headers rejected in production.
- Backend dashboard tests: monetary totals/averages/funnel amounts не зависят от `searchDeals limit: 500` или явно помечены как partial.
- Frontend tests/build guard: production mock mode rejected.
- Static/import graph check или targeted tests: dashboard production entry не импортирует `useDealStats` и не вызывает прямые `crm.item.list`/Bitrix24 CRM data methods.
- Scopes test: requested rights равны подтвержденному MVP minimum.
- Full `pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build` в `backend/` и `dashboard-app/`.

**Риски:**
- Реальный production handoff может зависеть от Black Hole/VibeCode Gateway возможностей, которые нельзя полностью проверить локально.
- Полные monetary aggregates могут потребовать уточнения VibeCode aggregate API contract или дополнительных запросов.
- Удаление template routes может затронуть generated typed routes и layout assumptions.
- Request id/log correlation должен остаться sanitized и не начать логировать CRM payloads или session tokens.

**Статус Phase 8.5 от 2026-07-23:**
- Сделано: закрыты audit findings по signed handoff freshness, production-safe env examples, request id, production mock guard, MVP scopes, template/demo route cleanup и legacy direct CRM path; для monetary KPI выбран подтвержденный текущим API путь explicit partial marking вместо неподдержанного `groupBy: currency`.
- Изменены файлы: см. `docs/08.5-hardening-report.md`; `dashboard-app/src/route-map.d.ts` обновлен generated route tooling из-за удаления pages.
- Пройдены тесты: TDD RED targeted падения подтверждены; targeted backend/frontend Phase 8.5 tests прошли; full `pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build` прошли в `backend/` и `dashboard-app/`.
- Остались риски: real production handoff producer и HMAC secret delivery требуют проверки в Black Hole/VibeCode Gateway; полные monetary totals для больших воронок требуют API windowing или нового aggregate contract; frontend build все еще предупреждает о chunk > 500 kB.

## Phase 9. End-To-End Quality Gates

**Цель:** пройти полный набор тестов, security checks, license checks и acceptance на тестовом портале до деплоя.

**Файлы:**
- Создать: `dashboard-app/tests/e2e/*.spec.ts` или согласованный e2e каталог
- Создать: `backend/tests/e2e/*.test.ts` или согласованный integration/e2e каталог
- Создать: `scripts/check-secrets.ps1` и/или `scripts/check-secrets.sh`, если нужен общий repo-level scan
- Создать: `scripts/check-licenses.ps1` и/или `scripts/check-licenses.sh`, если нужен общий repo-level scan
- Создать: `docs/09-qa-report.md`
- Изменить: `dashboard-app/package.json`
- Изменить: `backend/package.json`
- Изменить: `.gitignore`, если появляются локальные QA artifacts

**Работы:**
- [x] Добавить команды frontend: `lint`, `typecheck`, `test`, `build`.
- [x] Добавить команды backend: `lint`, `typecheck`, `test`, `build`.
- [x] Добавить security scan по frontend bundle, backend responses, logs и built artifacts.
- [x] Проверить bundle frontend на отсутствие `vibe_app_`, `vibe_api_`, `vibe_session_`, Authorization/session token leaks; SDK auth-flow literals остаются как vendor code и зафиксированы в `docs/09-qa-report.md`.
- [x] Проверить, что session token не попадает в `localStorage`/`sessionStorage`.
- [x] Проверить backend validation для невалидных фильтров.
- [x] Проверить CORS и security headers.
- [x] Проверить, что backend не принимает произвольные VibeCode endpoint'ы.
- [x] Проверить логи на отсутствие токенов, ФИО, email, телефонов, названий сделок, полных CRM-ответов и сумм отдельных сделок.
- [ ] Пройти acceptance в тестовом портале Битрикс24: левое меню, CRM-права, ограниченный пользователь, missing scopes, открытие карточки сделки. Результат: external blocker, портал недоступен из текущего окружения; сценарии зафиксированы в `docs/09-qa-report.md`.
- [x] Зафиксировать результаты и остаточные риски в `docs/09-qa-report.md`.

**Критерии готовности:**
- `cd dashboard-app; pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build` проходят.
- `cd backend; pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build` проходят.
- Contract, unit, integration, UI, security и license checks проходят.
- В тестовом портале подтверждены основные acceptance-сценарии.
- Все найденные critical/high issues исправлены или документально заблокированы внешней зависимостью.

**Тесты:**
- Автоматические: lint, typecheck, unit, contract, integration, UI/component, build, secret scan, license scan.
- Ручные: тестовый портал Битрикс24, restricted user, missing users scope, expired session, empty data, `meta.truncated=true`.

**Риски:**
- Без стабильного тестового портала часть E2E останется ручной и нестабильной.
- License scan может выявить transitive dependency с ручной проверкой.
- Security scan по паттернам не заменяет review логирования и error handling.

**Статус Phase 9 от 2026-07-23:**
- Сделано: добавлены backend/frontend e2e quality gates, repo-level secret/license scans, production VibeCode endpoint allowlist, расширенная redaction для CRM/PII логов, frontend tests/e2e включены в Vitest/lint.
- Изменены файлы: `backend/.env.example`, `backend/package.json`, `backend/src/config.ts`, `backend/src/logging/logger.ts`, `backend/tests/http/config.test.ts`, `backend/tests/http/logger.test.ts`, `backend/tests/e2e/qualityGates.test.ts`, `dashboard-app/package.json`, `dashboard-app/vitest.config.ts`, `dashboard-app/src/composables/useB24.ts`, `dashboard-app/src/security/productionSurface.test.ts`, `dashboard-app/tests/e2e/frontendQuality.spec.ts`, `scripts/check-secrets.ps1`, `scripts/check-licenses.ps1`, `docs/09-license-exceptions.json`, `docs/09-qa-report.md`, `docs/06-plan.md`.
- Пройдены тесты: targeted RED/GREEN для logger/config/e2e; full `pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm run security:scan`, `pnpm run license:scan` в `backend/` и `dashboard-app/`.
- Остались риски: portal acceptance заблокирован отсутствием доступной тестовой Битрикс24-сессии; две transitive зависимости имеют manual-reviewed license exceptions в `docs/09-license-exceptions.json`, но без license metadata в tarball; frontend build предупреждает о chunk > 500 kB; source-level storage scan не заменяет runtime iframe inspection.

## Phase 10. Production Packaging

**Цель:** подготовить production artifact без деплоя: `backend/` отдаёт static build из `dashboard-app/`, env/secrets описаны в `docs/`, health endpoints готовы.

**Файлы:**
- Создать: `backend/src/static.ts`
- Создать: `docs/10-deployment-guide.md`
- Создать: `docs/10-env-example.md`
- Изменить: `backend/package.json`
- Изменить: `dashboard-app/package.json`
- Изменить: `docs/09-qa-report.md`
- Изменить: `.gitignore`, если нужно исключить artifact/log/temp файлы

**Работы:**
- [x] Настроить production build: `dashboard-app` frontend artifact + `backend` server artifact.
- [x] Настроить backend static serving для собранного Vue frontend.
- [x] Проверить, что SPA fallback не перехватывает `/api/*`, `/health`, `/ready`.
- [x] Описать required env в `docs/10-env-example.md`: `VIBECODE_APP_KEY`, `VIBECODE_API_BASE_URL`, allowed origins, public URL, log level, deployment version.
- [x] Описать secret rotation и запрет попадания secrets в frontend bundle.
- [x] Описать rollback procedure для выбранного хостинга в `docs/10-deployment-guide.md`.
- [x] Собрать artifact локально и проверить, что в него не входят `.env`, сырые реальные fixtures, логи, reference-папки и временные QA-файлы.

**Критерии готовности:**
- Production artifact собирается документированной командой.
- Backend в production mode отдаёт frontend и API.
- Artifact не содержит secrets, несанитизированных данных, `b24-ai-starter/` и `templates-dashboard-vue/`.
- Инструкция деплоя, env, healthcheck, logs, rollback и smoke-тесты лежат в `docs/`.

**Тесты:**
- `cd dashboard-app; pnpm run build`.
- `cd backend; pnpm run build`.
- Запуск production backend локально со static frontend.
- `GET /health`, `GET /ready`, `GET /api/bootstrap` с тестовым контекстом.
- Secret scan по artifact.

**Риски:**
- Отличие production runtime Black Hole от локального Node.js может проявиться только после deploy.
- Static serving и SPA fallback могут конфликтовать с `/api/*`.
- Ошибка packaging может случайно включить reference-папки, fixtures или env.

**Статус Phase 10 от 2026-07-23:**
- Сделано: добавлен backend static serving для `dashboard-app/dist`, production build теперь собирает frontend и backend artifact, backend build компилирует только `src` в `backend/dist/index.js`, health/readiness возвращают `deploymentVersion`, Node adapter отдает binary static assets без text transcoding, `/api`, `/api/*`, `/health` и `/ready` не перехватываются SPA fallback, artifact gate усилен против raw CRM/PII-like JSON, задокументированы env, secret rotation, smoke, logs и rollback.
- Изменены файлы: `backend/.env.example`, `backend/package.json`, `backend/src/config.ts`, `backend/src/http/app.ts`, `backend/src/http/nodeResponse.ts`, `backend/src/index.ts`, `backend/src/static.ts`, `backend/src/types/api.ts`, `backend/tests/http/app.test.ts`, `backend/tests/http/config.test.ts`, `backend/tests/http/nodeResponse.test.ts`, `backend/tests/http/static.test.ts`, `backend/tsconfig.build.json`, `dashboard-app/package.json`, `scripts/check-secrets.ps1`, `scripts/check-artifact.ps1`, `docs/09-qa-report.md`, `docs/10-env-example.md`, `docs/10-deployment-guide.md`, `docs/06-plan.md`.
- Пройдены тесты: RED/GREEN `pnpm vitest run tests/http/static.test.ts tests/http/nodeResponse.test.ts`; targeted `pnpm vitest run tests/http/static.test.ts tests/http/config.test.ts tests/http/app.test.ts`; `cd backend; pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm run build:production`, `pnpm run security:scan`, `pnpm run license:scan`, `pnpm run artifact:check`; `cd dashboard-app; pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm run security:scan`, `pnpm run license:scan`; local compiled backend smoke: `/health`, `/ready`, `/`, `/api`, `/api/bootstrap` without signed handoff, byte-for-byte JPG static asset hash; negative artifact check with raw CRM/PII-like JSON fails as expected.
- Остались риски: полный `/api/bootstrap` smoke с реальным signed gateway handoff и VibeCode пользовательской сессией требует Phase 11/12 окружения; Black Hole runtime отличия проверяются только после deploy; frontend build все еще предупреждает о chunk > 500 kB и Rollup удаляет два vendor pure-comment annotations из `@vueuse/core`; artifact gate остается pattern-based и не заменяет allowlisted release archive.

## Phase 10.5. Server Preparation

**Цель:** подготовить Black Hole/server-side окружение к деплою без публикации production artifact: создать/проверить сервер, ключи и env profile так, чтобы Phase 11 занималась только deploy и runtime smoke.

**Файлы:**
- Создать: `docs/10.5-server-prep.md`
- Изменить: `docs/10-deployment-guide.md`, если фактические настройки Black Hole требуют уточнить команды или env profile
- Изменить: `docs/09-qa-report.md`, если подготовительные проверки выявят новый blocker
- Не изменять: frontend/backend runtime code, если подготовка не выявит несовместимость с hosting runtime

**Работы:**
- [x] Подтвердить выбранный hosting: Black Hole или явно согласованный production-хостинг.
- [x] Создать или выбрать production server/app в Black Hole без деплоя artifact из Phase 10.
- [x] Подтвердить Node.js 20 runtime, start command `cd backend && pnpm install --prod && pnpm start` или эквивалентную команду хостинга.
- [x] Подтвердить способ доставки source/archive artifact и исключения: `.env`, raw fixtures, logs, `b24-ai-starter/`, `templates-dashboard-vue/`, QA temp files.
- [x] Получить public HTTPS URL или staging URL, если Black Hole выдает его до первого deploy.
- [x] Подготовить server-side env profile без значений секретов: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `DEPLOYMENT_VERSION`, `APP_PUBLIC_URL`, `BITRIX24_ALLOWED_ORIGINS`, `VIBECODE_API_BASE_URL`, `VIBECODE_APP_KEY`, `SESSION_CONTEXT_MODE`, `SESSION_CONTEXT_HMAC_SECRET`, `FRONTEND_DIST_DIR`.
- [x] Подтвердить, что `VIBECODE_APP_KEY` является production `vibe_app_...`, а `vibe_api_...` не используется как runtime key.
- [x] Сгенерировать или принять `SESSION_CONTEXT_HMAC_SECRET` только в server-side secret storage; не сохранять реальное значение в repo, docs или chat. Результат: real value не создавался в файлах; генерация и передача через server-side env зафиксированы как explicit owner action перед Phase 11 deploy.
- [x] Проверить, есть ли у текущей машины авторизованный Black Hole CLI/API доступ для Phase 11; если нет, зафиксировать, кто выполняет deploy action.
- [x] Зафиксировать server/app id, public/staging URL, runtime, start command, env names без secret values, open blockers и owner actions в `docs/10.5-server-prep.md`.

**Критерии готовности:**
- Production server/app существует или документально выбран как внешний manual step перед Phase 11.
- Все required env names подготовлены как Phase 11 deploy env profile; реальные secret values не записаны в docs и перечислены как concrete owner actions перед deploy.
- Реальные secrets не записаны в git, docs, frontend bundle, build artifact или чат.
- Известен deploy mechanism для Phase 11: Black Hole CLI/API, панель хостинга или manual upload.
- Phase 11 может стартовать с конкретными server/app id, URL, env profile и списком остаточных blockers.

**Тесты:**
- Проверить локально `cd backend; pnpm run build:production`.
- Проверить локально `cd backend; pnpm run artifact:check`.
- Проверить локально `cd backend; pnpm run security:scan` и `cd dashboard-app; pnpm run security:scan` после build.
- Если Black Hole API доступен до deploy: выполнить non-destructive read-only check server/app metadata и env names без secret values.
- Secret hygiene check: `git status --short --untracked-files=all` не показывает новых `.env`, archives with secrets или log files.

**Риски:**
- Black Hole может требовать другой start command, архивную структуру или install step, чем локальный Node.js smoke.
- Реальный gateway signed handoff может быть недоступен до Bitrix24 placement, поэтому Phase 10.5 не закрывает пользовательский `/api/bootstrap` acceptance.
- Ошибка в server-side env names может проявиться только на `/ready` после deploy.
- Передача deploy/API ключей в чат создает риск утечки; предпочтительно использовать локальный CLI auth или server-side secret storage.

**Статус Phase 10.5 от 2026-07-23:**
- Сделано: подтвержден Black Hole server `c318fdf4-8ac1-485d-8bfc-82eb87d2b872`, `running`, `BLACKHOLE`, `CONNECTED`, `OWNER_ONLY`, URL `https://app-b19d2b35af4a.vibecode.bitrix24.tech`; подтвержден runtime `node20`; согласованы `displayName` и `description`; подготовлены allowlisted archive layout, deploy install/start/health fields и env profile без secret values; зафиксировано, что `vibe_api_...` используется только как management key, runtime key должен быть `VIBECODE_APP_KEY`, а ротация shared keys и генерация `SESSION_CONTEXT_HMAC_SECRET` являются owner actions перед Phase 11.
- Изменены файлы: `docs/06-plan.md`, `docs/10-deployment-guide.md`, `docs/10.5-server-prep.md`.
- Пройдены тесты: read-only VibeCode Infra server metadata check; read-only runtime catalog check; read-only public `/health` pre-deploy check; `cd backend; pnpm run build:production`; `cd backend; pnpm run artifact:check`; `cd backend; pnpm run security:scan`; `cd dashboard-app; pnpm run security:scan`; temporary allowlisted archive dry run with forbidden entry count `0`.
- Остались риски: shared management key should be rotated before Phase 11 deploy because it was pasted into chat; app key should preferably be rotated before deploy or immediately after first successful smoke; actual Gateway headers appear to be `X-Vibe-*`, while current backend production session mode expects signed `x-vibecode-*` headers, so user-context `/api/bootstrap` may need Phase 11/12 compatibility work; current public `/health` returns HTML from existing/default app until Phase 11 deploy; `SESSION_CONTEXT_HMAC_SECRET` must be generated outside the repository and supplied only through server-side deploy env.

## Phase 11. Deployment

**Цель:** развернуть приложение на Black Hole или согласованном production-хостинге и проверить runtime smoke.

**Файлы:**
- Создать: `docs/11-deployment-report.md`
- Изменить: `docs/10-deployment-guide.md`
- Изменить: `docs/09-qa-report.md`

**Работы:**
- [x] Создать production app/deployment в выбранном хостинге.
- [x] Настроить HTTPS public URL.
- [x] Настроить env secrets только в серверном окружении.
- [x] Настроить healthcheck на `GET /health` и readiness на `GET /ready`, если хостинг поддерживает.
- [x] Задеплоить production artifact из Phase 10.
- [x] Проверить runtime logs на отсутствие секретов и персональных данных.
- [ ] Выполнить smoke: `/health`, `/ready`, frontend root, `/api/bootstrap`, `/api/dashboard` в тестовом пользовательском контексте.
- [x] Зафиксировать URL, версию, commit/artifact id, env profile без значений секретов и smoke results в `docs/11-deployment-report.md`.

**Критерии готовности:**
- Production URL доступен по HTTPS.
- `/health` и `/ready` успешны.
- Frontend открывается с production backend.
- API работает с тестовой пользовательской сессией.
- Логи не содержат секретов.

**Тесты:**
- Runtime smoke endpoints.
- Manual dashboard load в тестовом portal context.
- Проверка headers: CSP, frame-ancestors, referrer-policy, x-content-type-options, permissions-policy.
- Проверка CORS allowed/blocked origins.

**Риски:**
- Неверные allowed origins или frame-ancestors могут заблокировать iframe.
- Env secrets могут быть настроены в неправильном окружении.
- Black Hole timeouts/memory/cold start могут потребовать tuning.

**Статус Phase 11 от 2026-07-23:**
- Сделано: задеплоен artifact/commit `192c9bb` на Black Hole server `c318fdf4-8ac1-485d-8bfc-82eb87d2b872`; public HTTPS URL `https://app-b19d2b35af4a.vibecode.bitrix24.tech`; настроены runtime env names без записи secret values в repo; deploy response `success=true`, `status=running`; подтверждены `/health`, `/ready`, frontend root, JS/CSS assets, CORS/security headers и blocked-origin behavior; проверены runtime logs на известные secret patterns; временные Phase 11 access tokens отозваны.
- Изменены файлы: `docs/11-deployment-report.md`, `docs/10-deployment-guide.md`, `docs/09-qa-report.md`, `docs/06-plan.md`.
- Пройдены тесты: `cd backend; pnpm run build:production`; `cd backend; pnpm run test` (23 files, 87 tests); `cd backend; pnpm run artifact:check`; `cd backend; pnpm run security:scan`; `cd dashboard-app; pnpm run test` (8 files, 37 tests); `cd dashboard-app; pnpm run security:scan`; runtime smoke на production URL через краткоживущий Black Hole `api-bearer` token.
- Остались риски: полный `/api/bootstrap` и `/api/dashboard` smoke с реальной пользовательской Bitrix24-сессией не выполнен без signed gateway handoff; текущий Black Hole `OWNER_ONLY` access policy блокирует anonymous direct access и может потребовать Phase 12 hosting/embedding настройки; app/management keys, переданные в chat, нужно ротировать после первого успешного smoke; frontend bundle сохраняет известный chunk size warning.

## Phase 12. Bitrix24 Embedding And Final Acceptance

**Цель:** встроить production URL в левое меню Битрикс24 и подтвердить MVP acceptance criteria на реальном пользовательском сценарии.

**Файлы:**
- Создать: `docs/12-acceptance-report.md`
- Создать: `docs/12-handoff.md`
- Изменить: `docs/11-deployment-report.md`

**Работы:**
- [ ] Настроить локальное приложение/placement в Битрикс24 с production URL.
- [ ] Выдать подтверждённые scopes из Phase 0.
- [ ] Проверить открытие из левого меню Битрикс24.
- [ ] Проверить, что данные ограничены CRM-правами текущего пользователя.
- [ ] Проверить default state: основная доступная воронка, последние 30 дней, «Все валюты».
- [ ] Проверить фильтры воронки, периода и валюты.
- [ ] Проверить KPI, funnel, trend, recent deals, warnings и empty states.
- [ ] Проверить restricted user: видит только доступные сделки.
- [ ] Проверить missing scopes: получает понятное сообщение.
- [ ] Проверить click-to-open deal card, если доступна ссылка/SDK-действие.
- [ ] Проверить, что приложение не выполняет write-операций в CRM.
- [ ] Подготовить финальный handoff: production URL, scopes, env список без секретов, smoke commands, известные ограничения MVP, будущие расширения.

**Критерии готовности:**
- Все MVP acceptance criteria из `docs/02-spec.md` и UI acceptance checklist из `docs/05-ui-brief.md` либо пройдены, либо имеют явную external blocker запись.
- Приложение доступно из левого меню Битрикс24.
- Frontend bundle и runtime storage не содержат ключей и session token.
- Пользователь с ограниченными правами не видит чужие сделки.
- Финальные отчёты `docs/12-acceptance-report.md` и `docs/12-handoff.md` заполнены.

**Тесты:**
- E2E в тестовом портале Битрикс24.
- Security verification frontend bundle/storage/logs.
- Manual UI regression на широкой, средней и узкой ширине iframe.
- Smoke after placement update.

**Риски:**
- Placement может требовать дополнительных Bitrix24-настроек, не известных до Phase 0.
- Разные порталы/регионы могут требовать другой `frame-ancestors` и allowed origins.
- Реальные CRM-права пользователей могут отличаться от тестовых сценариев, поэтому нужен restricted-user acceptance.

## Phase Execution Order

1. Phase 0 must finish before production backend contract work starts.
2. Phases 1 and 2 are backend-first and must create/modify only `backend/` plus supporting `docs/`.
3. Phases 3, 4 and 5 finish stable backend DTO before frontend migration.
4. Phase 6 migrates `dashboard-app/` to backend DTO and removes direct CRM data access for dashboard analytics.
5. Phase 7 replaces template UI in `dashboard-app/` with the sales funnel dashboard while preserving useful Bitrix24 UI patterns.
6. Phase 8 proves local integration between `dashboard-app/` and `backend/`.
7. Phase 8.5 closes security, handoff, data-accuracy and production-surface audit findings before quality gates.
8. Phase 9 is mandatory before any deployment.
9. Phase 10 packages the production artifact; Phase 10.5 prepares the server and secrets; Phases 11 and 12 are deployment and Bitrix24 placement phases.

## MVP Completion Checklist

- [ ] Research results complete and no open blocker for auth/session/API contracts.
- [ ] `b24-ai-starter/` and `templates-dashboard-vue/` used only as reference, not production runtime.
- [ ] Production frontend code lives in `dashboard-app/`.
- [ ] Production backend code lives in `backend/`.
- [ ] Architecture docs, plans and reports live in `docs/`.
- [ ] Backend is the only CRM data access path for frontend.
- [ ] Frontend contains no VibeCode keys or session token.
- [ ] Bootstrap returns references and defaults.
- [ ] Dashboard returns KPI, funnel, trend, recent deals, warnings and meta.
- [ ] KPI rules match specification.
- [ ] Multi-currency values are never merged.
- [ ] Missing users, missing currency, unknown semantics and truncation produce warnings.
- [ ] UI is readable inside iframe on wide, medium and narrow widths.
- [ ] All automated checks pass for `dashboard-app/` and `backend/`.
- [x] Production artifact excludes secrets, raw fixtures and reference folders.
- [ ] Production deployment is live.
- [ ] Bitrix24 left-menu placement is verified.
- [ ] Acceptance reports are saved in `docs/`.
