# Phase 14 Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a light, compact owner-demo dashboard with a visual funnel and one readable smooth trend.

**Architecture:** Keep the API DTO and global filter state. Split the pipeline selector from period/currency controls, move each to its approved visual location, and make the Created/Won trend choice local presentation state. Backend period buckets keep long-range lines readable.

**Tech Stack:** Vue 3, TypeScript, B24UI, B24 icons, Unovis `VisArea` and `VisLine`, Vitest, Tailwind CSS.

## Global Constraints

- Phase 14 uses the verified Phase 13 data contract.
- Period and currency remain global filters for KPI, funnel, recent deals, and trend.
- Default theme is light; preference persists in existing B24UI storage.
- Do not alter average-ticket calculation, CRM records, Phase 12 placement, or per-user authorization.
- Do not touch or commit `dashboard-app/src/route-map.d.ts`, `docs/audit.md`, or `screenshots/`.

---

### Task 1: Light Shell And No Internal Sidebar

**Files:**
- Modify: `dashboard-app/vite.config.ts`
- Modify: `dashboard-app/src/layouts/default.vue`
- Modify: `dashboard-app/src/pages/index.vue`
- Modify: `dashboard-app/src/assets/css/main.css`
- Modify: `dashboard-app/tests/e2e/frontendQuality.spec.ts`
- Create: `dashboard-app/src/pages/__tests__/index.test.ts`

**Interfaces:**
- Consumes: B24UI `useColorMode`, `MoonIcon`, `SunIcon`.
- Produces: sidebar-free shell and accessible icon-only persistent theme control.

- [ ] **Step 1: Write failing tests**

```ts
expect(read('vite.config.ts')).toContain("colorModeInitialValue: 'light'")
expect(read('src/layouts/default.vue')).not.toContain('B24DashboardSidebar')
```

Add a page test that expects moon in light mode, sun in dark mode, and a `light -> dark -> light` preference transition.

- [ ] **Step 2: Verify RED**

Run: `cd dashboard-app; pnpm vitest run tests/e2e/frontendQuality.spec.ts src/pages/__tests__/index.test.ts`

Expected: FAIL because startup mode is `auto`, the sidebar renders, and no page-level theme button exists.

- [ ] **Step 3: Implement the shell**

Set Vite `colorModeInitialValue` to `light`; retain its storage key. Replace sidebar/search/navigation markup in `default.vue` with `B24DashboardGroup` and `RouterView`. Add a tooltip-bearing top-right `B24Button` to `index.vue`; it shows moon except in dark mode, where it shows sun.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: tests pass and the toggle is icon-only.

- [ ] **Step 5: Commit**

```bash
git add dashboard-app/vite.config.ts dashboard-app/src/layouts/default.vue dashboard-app/src/pages/index.vue dashboard-app/src/assets/css/main.css dashboard-app/tests/e2e/frontendQuality.spec.ts dashboard-app/src/pages/__tests__/index.test.ts
git commit -m "feat: add light dashboard shell"
```

### Task 2: Move Global Filters To Their Approved Locations

**Files:**
- Create: `dashboard-app/src/components/dashboard/PipelineSelector.vue`
- Create: `dashboard-app/src/components/dashboard/TrendFilters.vue`
- Modify: `dashboard-app/src/components/dashboard/DashboardFilters.vue`
- Modify: `dashboard-app/src/pages/index.vue`
- Modify: `dashboard-app/src/components/dashboard/TrendChart.vue`
- Modify: `dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts`

**Interfaces:**
- Consumes: `DashboardFilters`, `DashboardFilterInput`, `buildFilterChange`, `canApplyCustomPeriod`.
- Produces: top `PipelineSelector` and TrendChart-header `TrendFilters`, both emitting global filter updates.

- [ ] **Step 1: Write failing placement tests**

```ts
expect(read('src/pages/index.vue')).toContain('<PipelineSelector')
expect(read('src/components/dashboard/TrendChart.vue')).toContain('<TrendFilters')
expect(read('src/pages/index.vue')).not.toContain('<DashboardFilters')
```

Add a model test where currency or period update retains selected `categoryId` and returns `shouldRefresh: true`.

- [ ] **Step 2: Verify RED**

Run: `cd dashboard-app; pnpm vitest run src/components/dashboard/__tests__/dashboardViewModel.test.ts src/pages/__tests__/index.test.ts`

Expected: FAIL because the single top `DashboardFilters` owns all controls.

- [ ] **Step 3: Implement split controls**

Extract category select and refresh into `PipelineSelector`. Extract period, currency, custom dates, apply, and refresh into `TrendFilters`. Pass the one `activeFilters` ref through `index.vue` and `TrendChart`; TrendChart emits updates back to the page and never owns a second range/currency state.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm vitest run src/components/dashboard/__tests__/dashboardViewModel.test.ts src/pages/__tests__/index.test.ts
git add dashboard-app/src/components/dashboard/PipelineSelector.vue dashboard-app/src/components/dashboard/TrendFilters.vue dashboard-app/src/components/dashboard/DashboardFilters.vue dashboard-app/src/pages/index.vue dashboard-app/src/components/dashboard/TrendChart.vue dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts dashboard-app/src/pages/__tests__/index.test.ts
git commit -m "feat: place dashboard filters by analytics context"
```

### Task 3: Render A Compact Layered Funnel

**Files:**
- Modify: `dashboard-app/src/components/dashboard/StageFunnel.vue`
- Modify: `dashboard-app/src/assets/css/main.css`
- Create: `dashboard-app/src/components/dashboard/__tests__/StageFunnel.test.ts`
- Modify: `dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts`

**Interfaces:**
- Consumes: `StageRowView` from `buildStageRows`.
- Produces: ordered trapezoid layers with stage name, count, and formatted stage money.

- [ ] **Step 1: Write failing funnel tests**

```ts
expect(rows.map(row => row.stageId)).toEqual(['NEW', 'PROPOSAL', 'WON'])
expect(rows[1]?.count).toBe(0)
expect(wrapper.findAll('[data-test="funnel-layer"]')).toHaveLength(3)
```

- [ ] **Step 2: Verify RED**

Run: `cd dashboard-app; pnpm vitest run src/components/dashboard/__tests__/dashboardViewModel.test.ts src/components/dashboard/__tests__/StageFunnel.test.ts`

Expected: FAIL because the component renders progress tracks, not layers.

- [ ] **Step 3: Implement the visual funnel and grid**

Keep `buildStageRows` and all zero stages. Replace tracks with stable-height layers using `clip-path: polygon(8% 0, 92% 0, 100% 100%, 0 100%)`, stage color, readable labels, and `aria-label`. Set desktop columns to `minmax(250px, 1fr) minmax(0, 2fr)`; retain one column at and below 860px.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm vitest run src/components/dashboard/__tests__/dashboardViewModel.test.ts src/components/dashboard/__tests__/StageFunnel.test.ts
git add dashboard-app/src/components/dashboard/StageFunnel.vue dashboard-app/src/assets/css/main.css dashboard-app/src/components/dashboard/__tests__/dashboardViewModel.test.ts dashboard-app/src/components/dashboard/__tests__/StageFunnel.test.ts
git commit -m "feat: render compact dashboard funnel"
```

### Task 4: Smooth Single-Series Trend

**Files:**
- Modify: `backend/src/services/aggregationService.ts`
- Modify: `backend/tests/services/aggregationService.test.ts`
- Modify: `dashboard-app/src/components/dashboard/TrendChart.vue`
- Create: `dashboard-app/src/components/dashboard/trendViewModel.ts`
- Create: `dashboard-app/src/components/dashboard/__tests__/trendViewModel.test.ts`
- Modify: `dashboard-app/src/assets/css/main.css`

**Interfaces:**
- Consumes: `DashboardResponse.trend` and local series `'created' | 'won'`.
- Produces: `buildTrendSeries(trend, series)` returning `{ period, count, wonAmountsByCurrency }[]`.

- [ ] **Step 1: Write failing bucket and series tests**

```ts
expect(response.trend.bucket).toBe('week')
expect(buildTrendSeries(trend, 'created').map(point => point.count)).toEqual([3, 0])
expect(buildTrendSeries(trend, 'won').map(point => point.count)).toEqual([1, 0])
```

Require zero periods and won money to remain in the selected series.

- [ ] **Step 2: Verify RED**

Run:
```bash
cd backend
pnpm vitest run tests/services/aggregationService.test.ts
cd ../dashboard-app
pnpm vitest run src/components/dashboard/__tests__/trendViewModel.test.ts
```

Expected: FAIL because a 30-day range uses days and TrendChart renders grouped bars.

- [ ] **Step 3: Implement readable trend output**

Use day buckets through 14 days, weeks from 15 through 180, and months above 180. Add `buildTrendSeries`; in `TrendChart` use a compact `Created/Won` control with Created default. Replace `VisGroupedBar` with matching `VisArea` and `VisLine`, one color, zero y-axis, non-overlapping x labels, and tooltip period/count plus formatted money in Won mode.

- [ ] **Step 4: Verify GREEN and commit**

```bash
cd backend
pnpm vitest run tests/services/aggregationService.test.ts
cd ../dashboard-app
pnpm vitest run src/components/dashboard/__tests__/trendViewModel.test.ts
git add ../backend/src/services/aggregationService.ts ../backend/tests/services/aggregationService.test.ts src/components/dashboard/TrendChart.vue src/components/dashboard/trendViewModel.ts src/components/dashboard/__tests__/trendViewModel.test.ts src/assets/css/main.css
git commit -m "feat: render readable dashboard trend"
```

### Task 5: Verify, Release, And Record Phase 14

**Files:**
- Modify: `docs/12.1-owner-demo-report.md`
- Modify: `docs/06-plan.md`

- [ ] **Step 1: Run complete local gates**

```bash
cd backend && pnpm run test && pnpm run typecheck && pnpm run lint && pnpm run build:production && pnpm run artifact:check
cd ../dashboard-app && pnpm run test && pnpm run typecheck && pnpm run lint && pnpm run security:scan
```

- [ ] **Step 2: Perform desktop and mobile visual checks**

Verify light default, icon-only theme control, absent internal sidebar, one-third/two-thirds row, readable funnel layers, smooth selected series, and stacked mobile panels.

- [ ] **Step 3: Deploy and smoke owner-demo production**

Deploy allowlisted production files with the existing owner-demo environment. Smoke health, ready, bootstrap, and categories 2, 4, 6, and 8 with one short-lived token; revoke it in `finally` and inspect logs without printing entries.

- [ ] **Step 4: Update release reports and commit**

```bash
git add docs/12.1-owner-demo-report.md docs/06-plan.md
git commit -m "docs: record phase 14 dashboard UI release"
```
