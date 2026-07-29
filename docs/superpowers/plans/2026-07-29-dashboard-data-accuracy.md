# Dashboard Data Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make the owner-demo dashboard calculate and render current CRM data for the selected pipeline accurately.

**Architecture:** The backend loads stage references for the selected pipeline and one bounded full deal snapshot. It calculates exact period metrics locally, avoiding the VibeCode CRM final-day filtering defect. The frontend keeps the current API DTO, renders grouped bars, and decodes numeric currency entities.

**Tech Stack:** Node.js 20, TypeScript, Vitest, Vue 3, B24UI, Unovis VisGroupedBar.

## Global Constraints

- Do not create, modify, or delete CRM records.
- Do not write API keys, bearer tokens, session data, or CRM payloads to source, tests, docs, artifacts, or logs.
- Do not touch or commit dashboard-app/src/route-map.d.ts, docs/audit.md, or screenshots/.
- A snapshot of exactly 500 records must return the existing PARTIAL_AGGREGATION warning.
- Preserve DashboardResponse and existing API routes.

---

### Task 1: Load Stages For The Selected Pipeline

**Files:**
- Modify: backend/src/services/referenceDataService.ts
- Modify: backend/src/http/routes/dashboard.ts
- Modify: backend/tests/services/referenceDataService.test.ts
- Modify: backend/tests/http/dashboard.test.ts

**Interfaces:**
- Consume: BootstrapContext, ReferenceDataService.getBootstrap, DashboardFilters.
- Produce: BootstrapResponse.stages for the selected category.

- [ ] **Step 1: Write failing reference tests**

Add a reference-service test with categories 2 and 4. Request category 4 and assert that the status call uses DEAL_STAGE_4. Add an HTTP route test for categoryId=4 and assert the route requests categoryId: 4 after filters validate.

~~~
expect(client.getStatuses).toHaveBeenCalledWith({ entityId: 'DEAL_STAGE_4' })
expect(referenceDataService.getBootstrap).toHaveBeenLastCalledWith({
  portalId: 'portal.bitrix24.com',
  sessionToken: 'vibe_session_secret',
  categoryId: 4
})
~~~

- [ ] **Step 2: Verify RED**

Run: cd backend; pnpm vitest run tests/services/referenceDataService.test.ts tests/http/dashboard.test.ts

Expected: FAIL because BootstrapContext does not accept categoryId and dashboard always uses default stages.

- [ ] **Step 3: Implement selected-category lookup**

Add categoryId?: number to BootstrapContext. In getBootstrap, use context.categoryId when it is present in the loaded categories; otherwise use selectDefaultCategory. Cache statuses by selected category and request DEAL_STAGE for category 0 or DEAL_STAGE_<id> for other categories.

In handleDashboard, load the default bootstrap first, validate the request, then load a category bootstrap only when filters.categoryId differs from bootstrap.defaults.categoryId.

~~~
const dashboardBootstrap = filters.categoryId === bootstrap.defaults.categoryId
  ? bootstrap
  : await referenceDataService.getBootstrap({
      portalId: session.publicContext.portalDomain,
      ...(session.sessionToken ? { sessionToken: session.sessionToken } : {}),
      ...(session.publicContext.userId ? { userId: session.publicContext.userId } : {}),
      categoryId: filters.categoryId
    })
~~~

- [ ] **Step 4: Verify GREEN**

Run: cd backend; pnpm vitest run tests/services/referenceDataService.test.ts tests/http/dashboard.test.ts

Expected: PASS; category 4 returns C4 stage references and category 0 retains DEAL_STAGE behavior.

- [ ] **Step 5: Commit**

~~~
git add backend/src/services/referenceDataService.ts backend/src/http/routes/dashboard.ts backend/tests/services/referenceDataService.test.ts backend/tests/http/dashboard.test.ts
git commit -m "fix: load stages for selected pipeline"
~~~

### Task 2: Calculate Metrics From An Exact Deal Snapshot

**Files:**
- Modify: backend/src/services/dealsQueryService.ts
- Modify: backend/src/http/routes/dashboard.ts
- Modify: backend/src/services/aggregationService.ts
- Modify: backend/tests/services/dealsQueryService.test.ts
- Modify: backend/tests/services/aggregationService.test.ts
- Modify: backend/tests/http/dashboard.test.ts

**Interfaces:**
- Consume: VibeCodeClient.searchDeals, selected category, ResolvedDateRange, selected stage references.
- Produce: existing DashboardResponse calculated from Deal[] and snapshotTruncated.

- [ ] **Step 1: Write failing snapshot tests**

Add a query-service test for one snapshot request with categoryId, optional currency, limit 500, and the full deal selection. It must not contain createdAt or closedAt. Add aggregation tests with a record at range.endAt, an open record with a future closedAt, and exactly 500 snapshot records.

~~~
expect(queries.snapshot).toMatchObject({
  filter: { categoryId: 2, currency: 'RUB' },
  limit: 500
})
expect(queries.snapshot.filter).not.toHaveProperty('createdAt')
expect(response.kpi.openCreated.count).toBe(1)
expect(response.kpi.won.count).toBe(0)
expect(response.meta.truncatedBlocks).toContain('snapshot')
~~~

- [ ] **Step 2: Verify RED**

Run: cd backend; pnpm vitest run tests/services/dealsQueryService.test.ts tests/services/aggregationService.test.ts tests/http/dashboard.test.ts

Expected: FAIL because the route still uses four aggregates and three upstream date-filtered searches.

- [ ] **Step 3: Implement snapshot data flow**

Replace time-bound aggregate and search requests with one searchDeals call using queries.snapshot. Its body contains categoryId, optional currency, limit: 500, and the full selection currently used by recent deals.

Refactor buildDashboardResponse to accept deals: Deal[] and snapshotTruncated: boolean. Calculate all dashboard blocks from the same local snapshot using exact ISO comparison to range.startAt and range.endAt.

~~~
const createdDeals = deals.filter(deal => isWithinRange(deal.createdAt, range))
const wonDeals = deals.filter(deal =>
  isSuccessful(deal, stageSemantics) &&
  deal.closedAt !== null &&
  isWithinRange(deal.closedAt, range)
)
const openDeals = deals.filter(deal => isProcess(deal, stageSemantics))
const openCreatedDeals = createdDeals.filter(deal => isProcess(deal, stageSemantics))
~~~

Build the funnel from createdDeals, money KPI from wonDeals, recent deals from createdDeals, and set totalRecords and recordsProcessed to deals.length. When deals.length === 500, add PARTIAL_AGGREGATION and truncatedBlocks: ['snapshot'].

- [ ] **Step 4: Fill trend buckets**

Keep selectTrendBucket. Add buildTrendPeriods(range, bucket) that enumerates every day, week, or month between range.dateFrom and range.dateTo. Initialize every period before incrementing createdCount or wonCount.

~~~
for (const period of buildTrendPeriods(range, bucket)) {
  points.set(period, { period, createdCount: 0, wonCount: 0, wonAmountsByCurrency: [] })
}
~~~

- [ ] **Step 5: Verify GREEN**

Run: cd backend; pnpm vitest run tests/services/dealsQueryService.test.ts tests/services/aggregationService.test.ts tests/http/dashboard.test.ts

Expected: PASS; last-day records appear, planned close dates do not become wins, and zero periods are present.

- [ ] **Step 6: Commit**

~~~
git add backend/src/services/dealsQueryService.ts backend/src/http/routes/dashboard.ts backend/src/services/aggregationService.ts backend/tests/services/dealsQueryService.test.ts backend/tests/services/aggregationService.test.ts backend/tests/http/dashboard.test.ts
git commit -m "fix: calculate dashboard from exact deal snapshot"
~~~

### Task 3: Render Grouped Trend Bars And Currency Symbols

**Files:**
- Modify: dashboard-app/src/components/dashboard/dashboardFormatters.ts
- Modify: dashboard-app/src/components/dashboard/TrendChart.vue
- Modify: dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts
- Create: dashboard-app/src/components/dashboard/__tests__/dashboardFormatters.test.ts

**Interfaces:**
- Consume: unchanged DashboardResponse.trend.points and currency formatString.
- Produce: decoded money labels and grouped bars for created and won values.

- [ ] **Step 1: Write failing frontend tests**

Test decimal and hexadecimal numeric entities in RUB formats. Assert that the rendered text contains the Unicode ruble character and never contains an ampersand-hash sequence. Assert that a zero-value trend point remains available to the chart data.

~~~
expect(formatMoney({ currency: 'RUB', amount: 760000 }, currencies)).toBe('760 000 \u20bd')
expect(formatMoney({ currency: 'RUB', amount: 760000 }, hexCurrencies)).not.toContain('&#')
expect(points.map(point => point.createdCount)).toContain(0)
~~~

- [ ] **Step 2: Verify RED**

Run: cd dashboard-app; pnpm vitest run src/components/dashboard/__tests__/dashboardFormatters.test.ts src/components/dashboard/__tests__/dashboardViewModel.test.ts

Expected: FAIL because formatMoney writes numeric HTML entities literally.

- [ ] **Step 3: Implement rendering changes**

Add decodeCurrencyFormat in dashboardFormatters.ts. It must replace decimal and hexadecimal numeric character entities before the existing # amount replacement.

In TrendChart.vue, replace VisLine with VisGroupedBar. Retain the numeric x accessor, the two existing y accessors, axes, and tooltip. Use the fixed blue/green series colors, dataStep 1, and groupMaxWidth 36.

~~~
<VisGroupedBar
  :x="x"
  :y="y"
  :color="['#0ea5e9', '#10b981']"
  :group-max-width="36"
  :data-step="1"
/>
~~~

- [ ] **Step 4: Verify GREEN**

Run: cd dashboard-app; pnpm vitest run src/components/dashboard/__tests__/dashboardFormatters.test.ts src/components/dashboard/__tests__/dashboardViewModel.test.ts

Expected: PASS; money labels render the ruble character and grouped bars retain zero periods.

- [ ] **Step 5: Commit**

~~~
git add dashboard-app/src/components/dashboard/dashboardFormatters.ts dashboard-app/src/components/dashboard/TrendChart.vue dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts dashboard-app/src/components/dashboard/__tests__/dashboardFormatters.test.ts
git commit -m "fix: render dashboard trend and currency labels"
~~~

### Task 4: Verify And Release

**Files:**
- Modify: docs/12.1-owner-demo-report.md
- Modify: docs/06-plan.md

**Interfaces:**
- Consume: production backend and frontend artifacts.
- Produce: running owner-demo deployment and recorded verification evidence.

- [ ] **Step 1: Run full local verification**

~~~
cd backend; pnpm run test; pnpm run typecheck; pnpm run lint; pnpm run build:production; pnpm run artifact:check
cd ../dashboard-app; pnpm run test; pnpm run typecheck; pnpm run lint; pnpm run security:scan
~~~

Expected: every command exits 0. The known Vite large-chunk warning may remain.

- [ ] **Step 2: Build and deploy allowlisted artifact**

Package only dashboard-app/dist, backend/dist, backend/package.json, and backend/pnpm-lock.yaml. Deploy to Black Hole server c318fdf4-8ac1-485d-8bfc-82eb87d2b872 with the existing owner-demo environment and a new deployment version.

- [ ] **Step 3: Run production smoke and revoke token**

Mint a short-lived api-bearer token. Request /api/bootstrap and /api/dashboard for categories 2, 4, 6, and 8. Verify 200 responses, selected stage prefixes, category 2 recent IDs 72, 74, and 76, and one successful deal in each demo category. Revoke the token immediately after smoke.

- [ ] **Step 4: Check logs and update reports**

Inspect app service logs since deployment for Request failed and credential-pattern matches. Update docs/12.1-owner-demo-report.md and the Phase 12.1 section of docs/06-plan.md with commit, deployment version, files, checks, and the 500-record partial-data risk.

- [ ] **Step 5: Commit release documentation**

~~~
git add docs/12.1-owner-demo-report.md docs/06-plan.md
git commit -m "docs: record dashboard data accuracy release"
~~~

