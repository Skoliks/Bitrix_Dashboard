# Phase 15: Open Deals Amount KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add currency-separated monetary totals to the existing «Открыто сейчас» KPI while preserving the dashboard's compact five-card layout.

**Architecture:** The backend continues to build all dashboard aggregates from the selected-category snapshot. It will pass the existing `openDeals` collection through the same money collector used by other monetary metrics and expose the result as `openNow.amountsByCurrency`. The frontend maps that array into a single abbreviated caption and a Bitrix24 tooltip with the full values; it does not add a sixth card or increase the KPI row height.

**Tech Stack:** Node.js 20, TypeScript, Vitest, Vue 3, Bitrix24 UI (`B24Card`, `B24Tooltip`), existing dashboard formatter/view-model layer.

## Global Constraints

- This phase is for the local owner-demo flow only; do not add Bitrix24 placement, iframe acceptance work, OAuth/Gateway session work, or user-rights changes.
- Do not implement pagination in this phase; a snapshot reaching 500 records remains marked with `PARTIAL_AGGREGATION` and `truncatedBlocks: ['snapshot']`.
- `openNow` includes all open/process deals in the selected category regardless of the selected date period.
- Apply the existing currency filter to `openNow`; `currency=all` returns each currency separately and a selected code returns only that code.
- Never convert or merge currencies.
- Deals without a currency remain in `openNow.count`, are excluded from money totals, and trigger `INCOMPLETE_FINANCIAL_DATA`; deals without an amount contribute `0`.
- Keep exactly five KPI cards. The «Открыто сейчас» count remains the primary value; its existing explanatory caption is replaced with a compact money caption and a tooltip containing full currency values.
- Do not add secrets, use `vibe_api_` keys in frontend code, or alter the existing owner-demo environment configuration.

---

## File Structure

- `backend/src/types/api.ts` — canonical BFF `DashboardResponse` contract.
- `backend/src/services/aggregationService.ts` — computes the open-deals money aggregate from normalized deals.
- `backend/tests/services/aggregationService.test.ts` — unit-level aggregation rules and warnings.
- `backend/tests/http/dashboard.test.ts` — `/api/dashboard` contract proof for the expanded KPI.
- `dashboard-app/src/types/dashboard.ts` — frontend copy of the dashboard DTO.
- `dashboard-app/src/mocks/dashboard.ts` — DTO-valid local mock data.
- `dashboard-app/src/api/dashboardApi.test.ts` — backend-only API fixture with the expanded contract.
- `dashboard-app/src/components/dashboard/dashboardFormatters.ts` — full and abbreviated currency rendering.
- `dashboard-app/src/components/dashboard/dashboardViewModel.ts` — maps `openNow` into a compact caption and tooltip text.
- `dashboard-app/src/components/dashboard/KpiCards.vue` — renders the caption with `B24Tooltip` without adding vertical rows.
- `dashboard-app/src/components/dashboard/__tests__/dashboardFormatters.test.ts` — abbreviation and currency-format regressions.
- `dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts` — card shape, compact text, full tooltip and empty-money behavior.
- `docs/06-plan.md` — Phase 15 status and verified outcome after implementation.

## Task 1: Extend The BFF Contract And Open-Deals Aggregation

**Files:**
- Modify: `backend/src/types/api.ts:97-103`
- Modify: `backend/src/services/aggregationService.ts:46-60`
- Modify: `backend/tests/services/aggregationService.test.ts:40-78`
- Modify: `backend/tests/http/dashboard.test.ts:73-109`

**Interfaces:**
- Consumes: `Deal`, `DashboardFilters`, and the existing `collectMoney(deals, warnings)` helper.
- Produces: `DashboardResponse['kpi']['openNow']` with the exact type `{ count: number; amountsByCurrency: Array<{ currency: string; amount: number }> }`.

- [ ] **Step 1: Write failing aggregation tests for money totals and date independence**

  In `aggregationService.test.ts`, make the existing exact-snapshot fixture use two open deals: an in-period `RUB 100` deal and an older `USD 50` deal. Assert the complete KPI object:

  ```ts
  expect(response.kpi.openNow).toEqual({
    count: 2,
    amountsByCurrency: [
      { currency: 'RUB', amount: 100 },
      { currency: 'USD', amount: 50 }
    ]
  })
  ```

  Add a second test with one process deal whose `currency` is `null` and one process deal with `amount: 0`; assert that the count remains `2`, the money list is only `[{ currency: 'RUB', amount: 0 }]`, and `INCOMPLETE_FINANCIAL_DATA` is present. Keep the older open deal outside the resolved date range so this test proves that `openNow` remains period-independent.

- [ ] **Step 2: Run the focused backend test to verify the contract is absent**

  Run: `pnpm vitest run tests/services/aggregationService.test.ts`

  Expected: FAIL because `openNow.amountsByCurrency` is missing from the response.

- [ ] **Step 3: Add the typed field and reuse the money collector**

  Change the backend API type and aggregation return value as follows:

  ```ts
  // backend/src/types/api.ts
  openNow: {
    count: number
    amountsByCurrency: Array<{ currency: string; amount: number }>
  }

  // backend/src/services/aggregationService.ts
  const openMoney = collectMoney(openDeals, warnings)

  openNow: {
    count: openDeals.length,
    amountsByCurrency: openMoney
  }
  ```

  Do not add a date predicate to `openDeals`; it must remain the process-semantic subset of the snapshot. Do not introduce a second money-aggregation helper.

- [ ] **Step 4: Expand the HTTP contract expectation**

  In the existing `returns dashboard data and applies category, date and currency filters` test, assert the response shape rather than only its count:

  ```ts
  openNow: {
    count: 0,
    amountsByCurrency: []
  }
  ```

  In the route test that requests `currency=RUB`, return one process deal with `amount: 125` and assert `body.kpi.openNow.amountsByCurrency` equals `[{ currency: 'RUB', amount: 125 }]`.

- [ ] **Step 5: Run focused backend verification**

  Run: `pnpm vitest run tests/services/aggregationService.test.ts tests/http/dashboard.test.ts`

  Expected: PASS; process deals outside the requested period remain in `openNow`, amounts stay separated by currency, and missing currency produces the established warning.

- [ ] **Step 6: Commit the backend aggregate contract**

  ```bash
  git add backend/src/types/api.ts backend/src/services/aggregationService.ts backend/tests/services/aggregationService.test.ts backend/tests/http/dashboard.test.ts
  git commit -m "feat: add open deal money totals"
  ```

## Task 2: Propagate The DTO Through Frontend Boundaries

**Files:**
- Modify: `dashboard-app/src/types/dashboard.ts:73-79`
- Modify: `dashboard-app/src/mocks/dashboard.ts:30-35`
- Modify: `dashboard-app/src/api/dashboardApi.test.ts:9-16`
- Modify: `dashboard-app/src/composables/useSalesDashboard.test.ts:15-25`

**Interfaces:**
- Consumes: backend `openNow` contract from Task 1.
- Produces: a frontend `DashboardResponse` where `kpi.openNow` is `{ count: number; amountsByCurrency: MoneyAmount[] }` in all production and mock paths.

- [ ] **Step 1: Update frontend test fixtures first**

  Add `amountsByCurrency` to every inline `openNow` test fixture. Use `[]` for zero-value fixtures and the following local mock value:

  ```ts
  openNow: {
    count: 12,
    amountsByCurrency: [{ currency: 'RUB', amount: 180000 }]
  }
  ```

  Update the mocked JSON in `dashboardApi.test.ts` so its dashboard response contains:

  ```ts
  kpi: {
    openNow: { count: 0, amountsByCurrency: [] },
    openCreated: { count: 0 },
    won: { count: 0 },
    wonAmountByCurrency: [],
    averageWonAmountByCurrency: []
  }
  ```

- [ ] **Step 2: Run frontend type checking to verify DTO incompatibility**

  Run: `pnpm run typecheck`

  Workdir: `dashboard-app`

  Expected: FAIL until the frontend interface declares `amountsByCurrency`.

- [ ] **Step 3: Extend the frontend DTO**

  Change the shared type in `dashboard-app/src/types/dashboard.ts`:

  ```ts
  openNow: {
    count: number
    amountsByCurrency: MoneyAmount[]
  }
  ```

  Do not make this field optional: the BFF contract from Task 1 always supplies an array, including an empty one.

- [ ] **Step 4: Run focused frontend contract checks**

  Run: `pnpm vitest run src/api/dashboardApi.test.ts src/composables/useSalesDashboard.test.ts`

  Workdir: `dashboard-app`

  Expected: PASS; mock mode and backend API mode both satisfy the new required DTO.

- [ ] **Step 5: Commit the frontend DTO propagation**

  ```bash
  git add dashboard-app/src/types/dashboard.ts dashboard-app/src/mocks/dashboard.ts dashboard-app/src/api/dashboardApi.test.ts dashboard-app/src/composables/useSalesDashboard.test.ts
  git commit -m "feat: propagate open deal money DTO"
  ```

## Task 3: Render A Compact Monetary Caption And Full-Value Tooltip

**Files:**
- Modify: `dashboard-app/src/components/dashboard/dashboardFormatters.ts:1-40`
- Modify: `dashboard-app/src/components/dashboard/dashboardViewModel.ts:29-90`
- Modify: `dashboard-app/src/components/dashboard/KpiCards.vue:18-31`
- Modify: `dashboard-app/src/assets/css/main.css:56-68`
- Modify: `dashboard-app/src/components/dashboard/__tests__/dashboardFormatters.test.ts:1-24`
- Modify: `dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts:42-72`

**Interfaces:**
- Consumes: `DashboardResponse['kpi']['openNow'].amountsByCurrency` from Task 2, plus existing `formatMoneyList`.
- Produces: `KpiCardView` with `description` as the compact money caption and an optional `descriptionTooltip` containing full formatted values.

- [ ] **Step 1: Write failing formatter and view-model tests**

  Add a formatter test using `30_000_000_000` RUB and `12_000` USD. Assert the compact output is `30 млрд ₽ · $12 тыс.` while the full list remains `['30 000 000 000 ₽', '$12 000']`.

  Update the view-model dashboard fixture:

  ```ts
  openNow: {
    count: 4,
    amountsByCurrency: [
      { currency: 'RUB', amount: 120000 },
      { currency: 'USD', amount: 900 }
    ]
  }
  ```

  Assert the first card uses the compact caption and retains the full text separately:

  ```ts
  expect(cards[0]).toMatchObject({
    key: 'openNow',
    value: '4',
    description: '120 тыс. ₽ · $900',
    descriptionTooltip: '120 000 ₽ · $900'
  })
  ```

  Add an empty-money assertion that `description` is `Сумма не указана` and `descriptionTooltip` is `undefined`; do not use `0`.

- [ ] **Step 2: Run the focused frontend tests to verify the new presentation is absent**

  Run: `pnpm vitest run src/components/dashboard/__tests__/dashboardFormatters.test.ts src/components/dashboard/__tests__/dashboardViewModel.test.ts`

  Workdir: `dashboard-app`

  Expected: FAIL because compact formatting and `descriptionTooltip` do not exist.

- [ ] **Step 3: Implement a focused compact money formatter**

  Add exported helpers that keep the existing full formatter unchanged:

  ```ts
  export const formatCompactMoneyList = (
    amounts: MoneyAmount[],
    currencies: BootstrapResponse['currencies']
  ): string => amounts.map(amount => formatCompactMoney(amount, currencies)).join(' · ')

  const formatCompactAmount = (value: number): string => {
    if (Math.abs(value) >= 1_000_000_000) return `${trimDecimal(value / 1_000_000_000)} млрд`
    if (Math.abs(value) >= 1_000_000) return `${trimDecimal(value / 1_000_000)} млн`
    if (Math.abs(value) >= 1_000) return `${trimDecimal(value / 1_000)} тыс.`
    return formatAmount(value)
  }
  ```

  Implement `formatCompactMoney` with the same decoded `formatString` and `#` replacement already used by `formatMoney`, but substitute `formatCompactAmount(amount.amount)`. Implement `trimDecimal` so `30.0` becomes `30` and one non-zero decimal remains, for example `1.5 млн`.

- [ ] **Step 4: Map the compact caption and tooltip without changing card count**

  Extend the view type and replace only the `openNow` card mapping:

  ```ts
  export interface KpiCardView {
    key: string
    title: string
    value: string
    description: string
    descriptionTooltip?: string
    money?: string[]
  }

  const openNowMoney = formatMoneyList(kpi.openNow.amountsByCurrency, currencies)

  {
    key: 'openNow',
    title: 'Открыто сейчас',
    value: formatCount(kpi.openNow.count),
    description: openNowMoney.length > 0
      ? formatCompactMoneyList(kpi.openNow.amountsByCurrency, currencies)
      : 'Сумма не указана',
    ...(openNowMoney.length > 0 ? { descriptionTooltip: openNowMoney.join(' · ') } : {})
  }
  ```

  In `KpiCards.vue`, replace only the open-now caption rendering with the established Bitrix24 tooltip pattern:

  ```vue
  <B24Tooltip v-if="card.descriptionTooltip" :text="card.descriptionTooltip">
    <p class="dashboard-muted dashboard-kpi-caption">{{ card.description }}</p>
  </B24Tooltip>
  <p v-else class="dashboard-muted dashboard-kpi-caption">{{ card.description }}</p>
  ```

  Keep the existing `card.money` block for the won-amount and average-ticket cards. Do not add a second money list to the open-now card and do not change `.dashboard-kpi-grid` from five columns.

- [ ] **Step 5: Add one-line overflow protection and run focused tests**

  Add the following scoped CSS in `dashboard-app/src/assets/css/main.css` beside `.dashboard-muted`:

  ```css
  .dashboard-kpi-caption {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ```

  Run: `pnpm vitest run src/components/dashboard/__tests__/dashboardFormatters.test.ts src/components/dashboard/__tests__/dashboardViewModel.test.ts`

  Workdir: `dashboard-app`

  Expected: PASS; no full multi-currency list is inserted below the count, and the full values remain in tooltip text.

- [ ] **Step 6: Commit the compact KPI UI**

  ```bash
  git add dashboard-app/src/assets/css/main.css dashboard-app/src/components/dashboard/dashboardFormatters.ts dashboard-app/src/components/dashboard/dashboardViewModel.ts dashboard-app/src/components/dashboard/KpiCards.vue dashboard-app/src/components/dashboard/__tests__/dashboardFormatters.test.ts dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts
  git commit -m "feat: show compact open deal amount"
  ```

## Task 4: Document Phase Completion And Run Quality Gates

**Files:**
- Modify: `docs/06-plan.md:after Phase 14.1 Hotfix`

**Interfaces:**
- Consumes: the verified API contract and UI behavior from Tasks 1-3.
- Produces: an auditable Phase 15 entry recording scope, rules, tests, and deliberately deferred pagination/Bitrix24 work.

- [ ] **Step 1: Add a Phase 15 status entry after the existing Phase 14.1 Hotfix section**

  Add a completed Phase 15 section that records all of the following exact facts:

  - `openNow` now has `count` plus `amountsByCurrency`;
  - it includes all open deals in the selected category irrespective of date range;
  - currencies remain separated and deals without currency create `INCOMPLETE_FINANCIAL_DATA`;
  - the count stays primary in the existing card, compact money replaces its old caption, and full values use a tooltip;
  - pagination, Bitrix24 placement, and user-context integration remain outside this phase.

- [ ] **Step 2: Run the full automated quality gates**

  Run from `backend/`:

  ```bash
  pnpm run lint
  pnpm run typecheck
  pnpm run test
  pnpm run build:production
  ```

  Run from `dashboard-app/`:

  ```bash
  pnpm run lint
  pnpm run typecheck
  pnpm run test
  pnpm run build
  ```

  Run from the repository root:

  ```bash
  pnpm run artifact:check
  pnpm run security:scan
  pnpm run license:scan
  ```

  Expected: all commands exit `0`; any existing frontend chunk-size warning may remain a warning but must not become an error.

- [ ] **Step 3: Manually verify the compact card in local owner-demo mode**

  Start the existing local backend and frontend according to `docs/08-local-integration.md`. Open the dashboard with a pipeline containing at least one open deal and verify:

  1. The KPI row still contains five equal-height cards.
  2. «Открыто сейчас» shows the count as its large value.
  3. Its former explanatory caption is replaced by a compact currency-separated amount.
  4. Hovering the compact amount exposes the full, non-abbreviated values.
  5. Selecting a date preset does not alter the open-deals count or amount for an unchanged snapshot.
  6. Selecting one currency leaves exactly that currency in the caption.

- [ ] **Step 4: Commit the Phase 15 documentation**

  ```bash
  git add docs/06-plan.md
  git commit -m "docs: record open deals amount phase"
  ```

## Spec Coverage Review

- Existing KPI expanded, not duplicated: Task 1 and Task 3.
- Category scope, no period restriction, selected-currency behavior, no conversion, and incomplete-data warning: Task 1 tests and implementation constraints.
- Compact caption, tooltip, no increased card height, and empty-money behavior: Task 3.
- No pagination, placement, or user-context scope expansion: global constraints and Task 4 documentation.
- Automated and manual verification: Task 4.
