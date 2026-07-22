# Phase 0 API Contracts

Date: 2026-07-22

## Auth Headers

Diagnostic service-key calls use:

```http
X-Api-Key: <VIBECODE_APP_KEY_OR_DIAGNOSTIC_KEY>
Accept: application/json
```

Production user-context calls from BFF to VibeCode must use this shape after the gateway session transport is captured and validated:

```http
X-Api-Key: <VIBECODE_APP_KEY>
Authorization: Bearer <USER_SESSION_TOKEN>
Accept: application/json
```

Never expose either header to frontend responses, logs, fixtures, screenshots, or bundle.

## Common Response Shape

Success:

```ts
type VibeSuccess<T> = {
  success: true
  data: T
  meta?: {
    total?: number
    hasMore?: boolean
    durationMs?: number
    autoWindowed?: boolean
    windowCount?: number
    batchWaves?: number
  }
}
```

Error:

```ts
type VibeError = {
  success: false
  error: {
    code: string
    message: string
  }
}
```

## Endpoints

### GET `/v1/me`

Purpose: diagnostic account/capability guide, scopes, VibeCode platform capabilities.

Important fields:

- `data.scopes`: available scopes for current key/account.
- `data.api.entityApi.entities`: entity endpoint registry.
- `data.infra`: Black Hole/runtime/deployment guidance.

Do not store full `/v1/me` raw response in repo; it includes account details and huge docs content.

### GET `/v1/guide`

Purpose: broad API guide. It is too large for a normal fixture. Store only extracted entity API contract in `guide.redacted.json`.

### GET `/v1/deals`

Example:

```http
GET /v1/deals?limit=2
```

Response data item fields confirmed:

```ts
type ExternalDeal = {
  id: number
  title: string
  amount: number
  currency: string | null
  categoryId: number
  stageId: string
  previousStageId: string | null
  stageSemanticId: 'P' | 'S' | 'F' | string | null
  assignedById: number | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  begindate?: string | null
  closed: boolean
  entityTypeId: number
}
```

`meta.total` may be `0` even when data is returned in the sampled diagnostic fixture; use `hasMore` for pagination continuation and validate contract in Phase 2.

### POST `/v1/deals/search`

Purpose: filtered deal list.

Valid example:

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
  "select": [
    "id",
    "title",
    "amount",
    "currency",
    "categoryId",
    "stageId",
    "stageSemanticId",
    "assignedById",
    "createdAt",
    "updatedAt",
    "closedAt"
  ],
  "order": {
    "createdAt": "desc"
  },
  "limit": 2
}
```

Invalid:

```json
{
  "filter": {
    "createdAt": {
      "from": "2026-07-01",
      "to": "2026-07-22"
    }
  }
}
```

Rejected with `INVALID_FILTER_OPERATOR`.

### POST `/v1/deals/aggregate`

Purpose: count/sum/avg/min/max aggregate over deal data.

Valid count by stage:

```json
{
  "op": "count",
  "groupBy": ["stageId"],
  "filter": {
    "categoryId": 0
  },
  "limit": 5000
}
```

Confirmed response:

```ts
type AggregateResponse = {
  count: number
  aggregates: Record<string, unknown>
  groups?: Array<{
    stageId?: string
    stageSemanticId?: string
    categoryId?: number
    assignedById?: number
    sourceId?: string | null
    count: number
    aggregates: Record<string, unknown>
  }>
  meta: {
    totalRecords: number
    recordsProcessed: number
    truncated: boolean
    groupTotal?: number
    groupsTruncated?: boolean
  }
}
```

Observed aggregatable group fields from error response:

- `amount`
- `stageId`
- `stageSemanticId`
- `categoryId`
- `assignedById`
- `sourceId`

`currency` is not accepted as a `groupBy` field in the tested response. Multi-currency summaries must either query/filter per currency or compute from deal list/other confirmed aggregate shape in a later phase.

## Backend BFF Contracts

### GET `/api/dashboard`

Purpose: return read-only dashboard data for one selected deal category, calendar period and currency filter.

Query:

```ts
type DashboardQuery = {
  categoryId?: number
  preset?: 'last7' | 'last30' | 'last90' | 'currentMonth' | 'previousMonth' | 'custom'
  dateFrom?: string
  dateTo?: string
  currency?: 'all' | string
}
```

Response:

```ts
type DashboardResponse = {
  filters: DashboardQuery & { categoryId: number; preset: string; currency: 'all' | string }
  references: Pick<BootstrapResponse, 'categories' | 'stages' | 'currencies' | 'users' | 'timeZone'>
  kpi: {
    openNow: { count: number }
    openCreated: { count: number }
    won: { count: number }
    wonAmountByCurrency: Array<{ currency: string; amount: number }>
    averageWonAmountByCurrency: Array<{ currency: string; amount: number }>
  }
  stageFunnel: Array<{
    stageId: string
    name: string
    sort: number
    color?: string
    semantic: string | null
    count: number
    share: number
    amountsByCurrency: Array<{ currency: string; amount: number }>
  }>
  trend: {
    bucket: 'day' | 'week' | 'month'
    points: Array<{
      period: string
      createdCount: number
      wonCount: number
      wonAmountsByCurrency: Array<{ currency: string; amount: number }>
    }>
  }
  recentDeals: Array<{
    id: number
    title: string
    amount: number
    currency: string | null
    categoryId: number
    stageId: string
    stageSemanticId: string | null
    assignedById: number | null
    assignedName: string | null
    createdAt: string
    updatedAt: string
    closedAt: string | null
  }>
  warnings: Array<{
    code: 'USERS_UNAVAILABLE' | 'INCOMPLETE_FINANCIAL_DATA' | 'UNKNOWN_STAGE_SEMANTICS' | 'PARTIAL_AGGREGATION'
  }>
  meta: {
    partialAggregation: boolean
    truncatedBlocks: string[]
    totalRecords: number
    recordsProcessed: number
  }
}
```

Notes:

- Monetary KPI are returned per currency and are not merged across currencies.
- Deals without currency are included in counts, excluded from money, and produce `INCOMPLETE_FINANCIAL_DATA`.
- `PARTIAL_AGGREGATION` is returned when VibeCode aggregate `meta.truncated=true` or a bounded deal search reaches its current safety limit.
- `recentDeals` is a separate search query and does not depend on aggregate truncation.

### GET `/v1/deal-categories`

Observed response can return a single object, not an array:

```ts
type DealCategory = {
  id: number
  name: string
  sort: number
  isLocked: boolean
  createdAt?: string
}
```

BFF schemas must accept object or array until Phase 2 confirms consistency.

### GET `/v1/statuses?filter[entityId]=DEAL_STAGE`

Stage response:

```ts
type Stage = {
  id: number
  entityId: string
  statusId: string
  name: string
  nameInit?: string
  sort: number
  system: boolean
  color?: string
  semantics: string | null
  categoryId?: number
  extra?: {
    SEMANTICS?: 'process' | 'success' | 'failure' | string
    COLOR?: string
  }
}
```

For non-main pipelines, use `DEAL_STAGE_<categoryId>`.

### GET `/v1/users`

Observed response can return a single object, not an array:

```ts
type User = {
  id: number
  active: boolean
  name?: string
  lastName?: string
  email?: string
  timeZone?: string
  userType?: string
}
```

Production DTO should not expose email/phone. For MVP expose display name only if scope allows; otherwise expose `assignedById`.

### GET `/v1/currencies`

Response:

```ts
type Currency = {
  id: string
  amountCnt: number
  amount: number
  sort: number
  base: boolean
  fullName: string
  lid: string
  formatString: string
  decPoint: string
  thousandsSep: string | null
  decimals: number
  dateUpdate: string
}
```

## Field Mapping

| Internal model | Internal field | External field | Notes |
|---|---|---|---|
| `Deal` | `id` | `id` | number |
| `Deal` | `title` | `title` | redact in fixtures/logs |
| `Deal` | `amount` | `amount` | number in samples |
| `Deal` | `currency` | `currency` | nullable possible |
| `Deal` | `categoryId` | `categoryId` | number |
| `Deal` | `stageId` | `stageId` | string |
| `Deal` | `stageSemanticId` | `stageSemanticId` | `P`, `S`, `F`, nullable/unknown |
| `Deal` | `assignedById` | `assignedById` | fallback display if users unavailable |
| `Deal` | `createdAt` | `createdAt` | ISO datetime |
| `Deal` | `updatedAt` | `updatedAt` | ISO datetime |
| `Deal` | `closedAt` | `closedAt` | ISO datetime or null |
| `DealCategory` | `id` | `id` | number |
| `DealCategory` | `name` | `name` | display label |
| `DealCategory` | `sort` | `sort` | ascending |
| `Stage` | `id` | `statusId` | use status code as stable id |
| `Stage` | `entityId` | `entityId` | `DEAL_STAGE` or `DEAL_STAGE_<categoryId>` |
| `Stage` | `name` | `name` | display label |
| `Stage` | `sort` | `sort` | ascending |
| `Stage` | `color` | `color` / `extra.COLOR` | optional |
| `Stage` | `semantic` | `semantics` / `extra.SEMANTICS` | fallback only |
| `User` | `id` | `id` | number |
| `User` | `displayName` | `name` + `lastName` | do not expose email |
| `User` | `timeZone` | `timeZone` | candidate portal timezone fallback |
| `Currency` | `id` | `id` | ISO-like code |
| `Currency` | `formatString` | `formatString` | render helper |
| `Currency` | `decimals` | `decimals` | render helper |

## Error Mapping

| VibeCode code/status | BFF code | UI handling |
|---|---|---|
| `MISSING_API_KEY` / 401 | `AUTH_REQUIRED` | blocking auth/config error |
| invalid/expired user token, if observed later | `SESSION_EXPIRED` | blocking re-open/re-auth message |
| missing scope, if observed later | `SCOPE_DENIED` | blocking or partial warning depending endpoint |
| Bitrix CRM denied, if observed later | `CRM_ACCESS_DENIED` | blocking access denied |
| `INVALID_PARAMS`, `INVALID_FILTER_OPERATOR`, `INVALID_AGGREGATION_OP` | `VALIDATION_ERROR` | developer/config or invalid filter state |
| 429 | `RATE_LIMITED` | retry/debounce, user warning |
| timeout | `UPSTREAM_TIMEOUT` | retry for reads |
| 502/503/504 | `UPSTREAM_UNAVAILABLE` | retry for reads |
