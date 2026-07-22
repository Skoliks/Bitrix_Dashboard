# Phase 0 Research Results

Date: 2026-07-22

## Summary

Phase 0 confirms the MVP should use a backend-only VibeCode integration: frontend never receives `vibe_app_*`, `vibe_api_*`, `vibe_session_*`, cookies, or raw CRM payloads. The production BFF should call VibeCode with `X-Api-Key: <VIBECODE_APP_KEY>` and, for user-context requests, `Authorization: Bearer <USER_SESSION_TOKEN>` only after the gateway/session handoff transport is captured and validated in a real iframe request.

The current repository now has Phase 1 scaffold, but Phase 0 establishes constraints that must be applied before Phase 2:

- VibeCode entity API uses `GET /v1/deals` for list, `POST /v1/deals/search` for filtered search, `POST /v1/deals/aggregate` for aggregation.
- `GET /v1/deals/search?...` is not a list endpoint; it returns `INVALID_PARAMS`.
- Date filters use operator keys like `$gte` and `$lte`, not `from`/`to`.
- `currency` is filterable, but not accepted as an `aggregate.groupBy` field in the tested API response.
- `meta.truncated` is exposed inside aggregate data as `data.meta.truncated`; search can expose `meta.autoWindowed`, `windowCount`, and `batchWaves`.

## Research Brief Answers

### 1. Gateway Session Protocol

Confirmed target architecture from spec and VibeCode API guide:

1. Bitrix24 iframe opens the frontend.
2. VibeCode Gateway provides launch/user session context to the application runtime.
3. Frontend calls BFF endpoints without storing or forwarding raw session tokens from browser storage.
4. BFF extracts server-side user session context and calls VibeCode API with:
   - `X-Api-Key: <VIBECODE_APP_KEY>`
   - `Authorization: Bearer <USER_SESSION_TOKEN>`

Transport prerequisite for later phases: the exact gateway header/cookie/signature name is not present in local reference docs and was not observable through direct diagnostic API-key calls. Current Phase 1 `session/context` must remain provisional until a real iframe/gateway request is captured.

### 2. Scopes

Minimum MVP scopes remain:

- `crm`
- `user_brief`

Reasoning:

- `crm` is required for deals, statuses, deal categories, currencies, and CRM access.
- `user_brief` is sufficient for responsible user display in the planned MVP. The broader `user` scope should not be requested unless future requirements need email/phone/full profile data.
- Diagnostic `/v1/me` shows both `user` and `user_brief` are available in the test key, but the MVP should choose the narrower scope.

If `/v1/users` is unavailable in production due to missing scope or permissions, dashboard should continue with `assignedById` and show a non-blocking warning.

### 3. Deal Contract

Confirmed deal fields from real redacted responses:

- `id`: number
- `title`: string, PII/business text, must be redacted in fixtures/logs
- `amount`: number
- `currency`: string, e.g. `RUB`
- `categoryId`: number
- `stageId`: string
- `previousStageId`: string or null
- `stageSemanticId`: `"P"`, `"S"`, `"F"` or nullable depending on source
- `assignedById`: number
- `createdAt`, `updatedAt`, `closedAt`, `begindate`, `movedTime`: ISO datetime strings
- `closed`: boolean
- `entityTypeId`: number

Use external schemas before mappers; do not assume Bitrix REST legacy names like `OPPORTUNITY` or `CURRENCY_ID` at the BFF boundary.

### 4. Filters

Confirmed syntax:

```json
{
  "filter": {
    "categoryId": 0,
    "stageSemanticId": "P",
    "currency": "RUB",
    "createdAt": {
      "$gte": "2026-07-01",
      "$lte": "2026-07-22"
    }
  },
  "limit": 2
}
```

Supported operators observed in an error response: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$contains`, `$in`, `$nin`, `>`, `>=`, `<`, `<=`, `!`, `%`, `!=`.

`from`/`to` are rejected with `INVALID_FILTER_OPERATOR`.

### 5. Aggregation And Truncation

Confirmed aggregate request:

```json
{
  "op": "count",
  "groupBy": ["stageId"],
  "filter": { "categoryId": 0 },
  "limit": 5000
}
```

Confirmed response metadata:

- `data.meta.totalRecords`
- `data.meta.recordsProcessed`
- `data.meta.truncated`
- `data.meta.groupTotal`
- `data.meta.groupsTruncated`

For the tested portal `truncated=false`, `recordsProcessed=totalRecords`.

Risk: no naturally truncated sample was available. Phase 2/4 tests must include an artificial fixture with `truncated=true`.

### 6. Rate Limits, Timeouts, Retry

Observed VibeCode guide limits:

- feedback route documents `5 per minute per API key`, but CRM route rate limits were not explicitly returned in tested contract.
- infra inline deploy can return `429 DEPLOY_BACKEND_BUSY` with `retryAfterSeconds`.

MVP policy:

- timeout BFF -> VibeCode calls at 10-15 seconds unless endpoint proves slower;
- retry only idempotent reads and only for `429`, `502`, `503`, `504`, timeout;
- never retry `400`, `401`, `403`;
- debounce frontend filter changes.

### 7. Error Codes

Observed direct API errors:

- Missing API key: HTTP 401, `MISSING_API_KEY`.
- Invalid GET search shape: HTTP 400, `INVALID_PARAMS`.
- Invalid aggregate op missing/invalid shape: `INVALID_AGGREGATION_OP` was observed when no valid `op` was supplied.
- Invalid filter operator: HTTP 400, `INVALID_FILTER_OPERATOR`.
- Unsupported aggregate group field: HTTP 400, `INVALID_PARAMS`.

BFF mapping:

- `MISSING_API_KEY`, missing user session -> `AUTH_REQUIRED`
- invalid/expired user session -> `SESSION_EXPIRED`
- missing scope -> `SCOPE_DENIED`
- Bitrix CRM permission denial -> `CRM_ACCESS_DENIED`
- rate limits -> `RATE_LIMITED`
- timeout -> `UPSTREAM_TIMEOUT`
- 502/503/504 -> `UPSTREAM_UNAVAILABLE`
- bad request/filter/schema -> `VALIDATION_ERROR`

### 8. Stages

For main pipeline use:

- `GET /v1/statuses?filter[entityId]=DEAL_STAGE`

For additional pipelines use:

- `GET /v1/statuses?filter[entityId]=DEAL_STAGE_<categoryId>`

Stage status fields include `statusId`, `sort`, `color`, nullable `semantics`, and `extra.SEMANTICS`. Use `stageSemanticId` from deals first, then fallback to `statuses.extra.SEMANTICS`/`semantics`.

### 9. Timezone And Dates

`/v1/users` test response includes `timeZone: "Asia/Yakutsk"` for the current user. No separate portal timezone endpoint was confirmed. BFF should derive timezone in this order:

1. portal/bootstrap field if VibeCode exposes one later;
2. current user `timeZone`;
3. configured default;
4. UTC as last fallback with warning.

Frontend stores calendar dates only; BFF calculates period boundaries in portal timezone.

### 10. Frontend Libraries

Current frontend libraries are enough for MVP:

- Bitrix24 UI/icons for layout and controls.
- TanStack Table for recent deals.
- Unovis for trend chart.
- Custom Vue/SVG/CSS component for funnel.
- `@internationalized/date` for date selection.
- `date-fns` for formatting.
- Zod for DTO checks.

Do not add new UI/chart/grid libraries in MVP without a separate justification.

### 11. Licenses

Direct dependency license metadata was checked via `pnpm view <package> license`.

Allowed direct licenses found:

- MIT
- Apache-2.0

`pnpm licenses list --json` could not complete because package index files were missing in local pnpm store. Transitive license audit remains an automated QA requirement after `pnpm install` is refreshed.

### 12. Iframe Security

Security posture:

- HTTPS-only public URL.
- CORS allowlist for expected Bitrix24 origins and app origin only.
- CSP `frame-ancestors` must include the production Bitrix24 portal origins.
- Frontend must not store session token in `localStorage`/`sessionStorage`.
- Cookies, if used, must be `SameSite=None; Secure; HttpOnly`; Phase 0 does not require cookie-based auth.
- BFF endpoints should reject arbitrary origins and arbitrary VibeCode endpoint proxying.

### 13. Logging And Cache Policy

Logs must not contain tokens, cookies, auth headers, full CRM responses, titles, user names, emails, phones, or individual deal amounts.

Permitted logs:

- request id
- route
- sanitized portal id/hash
- sanitized user id/hash
- endpoint class
- status code
- duration
- warning/error code

Cache:

- reference data can be cached by portal and category:
  - categories: 10 minutes
  - stages: 10 minutes
  - currencies: 30-60 minutes
  - users: 5-10 minutes
- user aggregate cache is optional and max 30-60 seconds with key `portal:user:filters`.

### 14. Backend Runtime And Deployment

Recommended topology remains one Node.js 20 service that serves the built Vue frontend and `/api/*`.

Black Hole/VibeCode infra guide confirms:

- `node20` runtime is a valid source/deploy runtime example.
- source-at-create/deploy expects archive content and a single start command.
- infra operations expose logs and access endpoints.
- inline deploy concurrency can be limited; deployments must handle `429` retry guidance.

### 15. Testing Without Production CRM

Use redacted fixtures in `docs/fixtures/vibecode/` for contract/unit tests. Add synthetic edge-case fixtures in Phase 2/4 for:

- `meta.truncated=true`
- missing `/v1/users`
- empty categories/stages
- unknown/null `stageSemanticId`
- missing amount/currency
- multi-currency amounts

## Manual Smoke Results

- `GET /v1/me`: success with diagnostic key.
- `GET /v1/deals?limit=2`: success.
- `POST /v1/deals/search`: success with body filters.
- `POST /v1/deals/aggregate`: success for `op=count`, `groupBy=["stageId"]`.
- Missing API key: HTTP 401 `MISSING_API_KEY`.
