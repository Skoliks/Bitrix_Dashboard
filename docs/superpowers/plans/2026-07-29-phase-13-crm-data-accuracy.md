# Phase 13 CRM Data Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the selected pipeline's trend and winning-deal totals match verified CRM data.

**Architecture:** Establish a non-sensitive production contract for pipelines 2, 4, 6, and 8, reproduce the mismatch with anonymized tests, then repair only the backend or chart boundary proved responsible.

**Tech Stack:** Node.js 20, TypeScript, Vue 3, Vitest, VibeCode Infra API.

## Global Constraints

- Do not create or modify CRM records, store tokens, keys, or CRM payloads.
- Do not change average-ticket calculation or the `DashboardResponse` contract.
- Preserve the 500-record `PARTIAL_AGGREGATION` safeguard.
- Do not touch or commit `dashboard-app/src/route-map.d.ts`, `docs/audit.md`, or `screenshots/`.

---

### Task 1: Establish The Live Data Contract

**Files:**
- Modify: `docs/12.1-owner-demo-report.md`

**Interfaces:**
- Consumes: temporary `api-bearer` server access and `GET /api/dashboard`.
- Produces: non-sensitive category summary used by tests.

- [ ] **Step 1: Query the four selected categories using one 300-second token**

Use `try/finally` so this request is always made after the smoke calls:

```text
DELETE /v1/infra/servers/<server-id>/access-tokens/<token-id>
```

For each category 2, 4, 6, and 8 request `?preset=last30`. Retain only status, category ID, selected stage prefix, winner count, money-row count, trend-point count, non-zero trend-point count, and warning codes.

- [ ] **Step 2: Compare category 2 to the accepted business fact**

The expected category-2 winner summary is two successful deals totaling `500000233` RUB. Average-ticket is a control value only and must not be changed.

- [ ] **Step 3: Append only the safe summary to the owner-demo report**

```markdown
| Category | API status | Stage prefix | Winner count | Money rows | Trend points | Non-zero trend points | Warnings |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 4: Commit the diagnostic**

```bash
git add docs/12.1-owner-demo-report.md
git commit -m "docs: record phase 13 dashboard diagnostics"
```

### Task 2: Add Regression Tests For The Proven Boundary

**Files:**
- Modify: `backend/tests/services/aggregationService.test.ts`
- Modify: `backend/tests/http/dashboard.test.ts`
- Create: `dashboard-app/src/components/dashboard/__tests__/TrendChart.test.ts`

**Interfaces:**
- Consumes: `buildDashboardResponse`, dashboard route, `TrendChart` props.
- Produces: stable test coverage for winner totals and replacement of trend data after category changes.

- [ ] **Step 1: Write the failing anonymized winner test**

```ts
const response = buildDashboardResponse({
  ...baseInput,
  filters: { ...baseInput.filters, categoryId: 2 },
  deals: [
    deal({ id: 1, categoryId: 2, stageId: 'WON', stageSemanticId: 'S', amount: 500000000, currency: 'RUB' }),
    deal({ id: 2, categoryId: 2, stageId: 'WON', stageSemanticId: 'S', amount: 233, currency: 'RUB' })
  ],
  snapshotTruncated: false
})
expect(response.kpi.won).toEqual({ count: 2 })
expect(response.kpi.wonAmountByCurrency).toEqual([{ currency: 'RUB', amount: 500000233 }])
```

Add a route test that requests category 4 after category 2 and expects category-4 snapshot filter and stage references.

- [ ] **Step 2: Write the failing chart replacement test**

Mount `TrendChart` with category-2 points, update `trend` to category-4 points, then assert a stable `data-test="trend-point-count"` marker reports the new point count and old period is absent.

- [ ] **Step 3: Run focused tests and verify RED**

```bash
cd backend
pnpm vitest run tests/services/aggregationService.test.ts tests/http/dashboard.test.ts
cd ../dashboard-app
pnpm vitest run src/components/dashboard/__tests__/TrendChart.test.ts
```

Expected: the test corresponding to the live mismatch fails. If all pass, document that the defect is upstream before changing source code.

- [ ] **Step 4: Apply only the correction proved by Task 1**

- Correct `backend/src/vibecode/mappers.ts` only if mapped deal values differ from the verified CRM contract.
- Correct the `wonDeals` predicate and money input in `backend/src/services/aggregationService.ts` only if it differs from the accepted contract. Do not alter average-ticket calculation.
- Add a deterministic key to the Unovis container in `TrendChart.vue` only if the API response is correct and its renderer retains old points.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 3 commands. Expected: two category-2 winners, `500000233` RUB, and replacement of old chart points.

- [ ] **Step 6: Commit the repair**

```bash
git add backend/src/vibecode/mappers.ts backend/src/services/aggregationService.ts backend/tests/services/aggregationService.test.ts backend/tests/http/dashboard.test.ts dashboard-app/src/components/dashboard/TrendChart.vue dashboard-app/src/components/dashboard/__tests__/TrendChart.test.ts
git commit -m "fix: refresh verified dashboard trend data"
```

Stage only files changed by the verified root cause.

### Task 3: Verify And Release Phase 13

**Files:**
- Modify: `docs/12.1-owner-demo-report.md`
- Modify: `docs/06-plan.md`

- [ ] **Step 1: Run full checks**

```bash
cd backend && pnpm run test && pnpm run typecheck && pnpm run lint && pnpm run build:production && pnpm run artifact:check
cd ../dashboard-app && pnpm run test && pnpm run typecheck && pnpm run lint && pnpm run security:scan
```

- [ ] **Step 2: Deploy an allowlisted artifact**

Archive only `backend/package.json`, `backend/pnpm-lock.yaml`, `backend/dist/**`, and `dashboard-app/dist/**`; deploy with the existing owner-demo environment.

- [ ] **Step 3: Smoke and record the release**

Smoke `/health`, `/ready`, `/api/bootstrap`, and each selected category with a short-lived token, revoke it, scan app logs without printing them, update the two reports, and commit:

```bash
git add docs/12.1-owner-demo-report.md docs/06-plan.md
git commit -m "docs: record phase 13 data accuracy release"
```
