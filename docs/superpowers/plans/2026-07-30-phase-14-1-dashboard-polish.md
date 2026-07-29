# Phase 14.1 Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make the owner-demo dashboard trend clear and bounded in every period, and make the sales-stage funnel compact with centered content.

**Architecture:** Keep the existing Vue dashboard data model and Unovis integration. Replace the filled trend series with a single line, enforce width boundaries in the dashboard shell and chart viewport, and revise only the funnel component markup and Phase 14 dashboard CSS. The API, filters, KPI calculations, and other phases remain unchanged.

**Tech Stack:** Vue 3, TypeScript, `@unovis/vue`, B24 UI, Vitest, pnpm.

## Global Constraints

- Work only on Phase 14.1 presentation behavior.
- Do not change Bitrix24 API requests, dashboard aggregation, filters, KPI calculations, or earlier phase behavior.
- Do not modify, stage, commit, or delete `dashboard-app/src/route-map.d.ts`, `docs/audit.md`, or `screenshots/`.
- Keep both light and dark themes usable.
- Never place credentials in source, documentation, test output, archives, or commits.

---

### Task 1: Render the Trend as a Single Colored Line

**Files:**
- Modify: `dashboard-app/src/components/dashboard/TrendChart.vue`
- Modify: `dashboard-app/src/components/dashboard/__tests__/TrendChart.test.ts`
- Modify: `dashboard-app/tests/e2e/frontendQuality.spec.ts`

- [ ] Add a failing regression assertion that the trend component uses `VisLine` and no longer imports or renders `VisArea`.
- [ ] Run `pnpm vitest run src/components/dashboard/__tests__/TrendChart.test.ts tests/e2e/frontendQuality.spec.ts` from `dashboard-app` and confirm the new assertion fails because the area series is still present.
- [ ] Remove `VisArea` from the Unovis import and template; retain one smooth `VisLine` with a two-pixel stroke.
- [ ] Keep blue `#0ea5e9` for the Created metric and green `#10b981` for the Won metric. Do not add another series, fill, gradient, or chart background.
- [ ] Update mocks and component assertions so the test suite covers the line-only component.
- [ ] Re-run `pnpm vitest run src/components/dashboard/__tests__/TrendChart.test.ts tests/e2e/frontendQuality.spec.ts` and confirm it passes.
- [ ] Commit with `fix: render dashboard trend as a line`.

### Task 2: Bound the Chart and Increase Its Useful Height

**Files:**
- Modify: `dashboard-app/src/assets/dashboard.css`
- Modify: `dashboard-app/src/dashboard/trendViewModel.test.ts`
- Modify: `dashboard-app/tests/e2e/frontendQuality.spec.ts`

- [ ] Add failing tests for a width-capped trend layout and for CSS guards on `.dashboard-shell` and `.dashboard-trend-viewport`.
- [ ] Run `pnpm vitest run src/dashboard/trendViewModel.test.ts tests/e2e/frontendQuality.spec.ts` from `dashboard-app` and confirm the CSS regression assertions fail before the styles are changed.
- [ ] Place the horizontal overflow guard on `.dashboard-shell`, not only on the page header. Ensure the analytics grid, card, and chart viewport can shrink within the available width and hide any residual SVG overflow.
- [ ] Set a taller desktop chart canvas (380px), with explicit smaller responsive heights for narrow screens, so the graph uses the available vertical space without covering adjacent content.
- [ ] Configure the existing Unovis axis CSS variables for thin neutral grid and axis lines, readable labels in both themes, and a transparent chart surface. Do not use black fills or decorative backgrounds.
- [ ] Preserve the existing `buildTrendLayout` point and label behavior while verifying its rendered width never exceeds the passed available width.
- [ ] Re-run `pnpm vitest run src/dashboard/trendViewModel.test.ts tests/e2e/frontendQuality.spec.ts` and confirm it passes.
- [ ] Commit with `fix: keep dashboard trend within its viewport`.

### Task 3: Compact and Center the Sales-Stage Funnel

**Files:**
- Modify: `dashboard-app/src/components/dashboard/StageFunnel.vue`
- Modify: `dashboard-app/src/components/dashboard/__tests__/StageFunnel.test.ts`
- Modify: `dashboard-app/src/assets/dashboard.css`

- [ ] Add a failing component test requiring one centered content group in every funnel layer, including a zero-count stage.
- [ ] Run `pnpm vitest run src/components/dashboard/__tests__/StageFunnel.test.ts` from `dashboard-app` and confirm it fails before the new markup exists.
- [ ] Group each stage name and deal count on one centered primary row. Keep the monetary amount, when present, centered below that row inside the same trapezoid.
- [ ] Reduce layer padding, minimum height, and inter-layer spacing while keeping text legible. Keep zero-count stages visible and keep all text inside its own layer.
- [ ] Let the desktop analytics grid align cards at their natural heights, so the taller trend does not force the compact funnel card to occupy unused vertical space. Preserve the one-column responsive layout.
- [ ] Re-run `pnpm vitest run src/components/dashboard/__tests__/StageFunnel.test.ts` and confirm it passes.
- [ ] Commit with `fix: compact dashboard funnel stages`.

### Task 4: Verify, Document, and Deploy the Phase

**Files:**
- Modify: `docs/06-plan.md`
- Modify: `docs/12.1-owner-demo-report.md`

- [ ] Inspect `git diff --check` and `git status --short`; confirm protected and unrelated files are absent from staged changes.
- [ ] From `dashboard-app`, run `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run artifact:check`, and `pnpm run security:scan`.
- [ ] From `dashboard-api`, run `pnpm run test` and the focused dashboard route tests used by Phase 14.
- [ ] Deploy the built owner-demo application to the existing VibeCode server using the approved archive workflow. Preserve the server environment and do not print API keys.
- [ ] Smoke-test `/health`, `/ready`, and dashboard requests for all available CRM categories with `last7`, `last30`, `last90`, `currentMonth`, and `previousMonth`; verify each response has a bounded trend layout, a non-empty stage list, and no request failures in service logs.
- [ ] Update Phase 14.1 in `docs/06-plan.md` with completed work, modified files, exact verification commands and results, deployment status, and remaining visual-review risk.
- [ ] Update `docs/12.1-owner-demo-report.md` with the release snapshot, production smoke evidence, and the remaining owner visual acceptance check for both themes and all five period filters.
- [ ] Commit documentation with `docs: record phase 14.1 dashboard polish`.

## Final Review Checklist

- [ ] The graph is exactly one colored line on a transparent surface; no `VisArea`, fill, gradient, or black background remains.
- [ ] The trend remains inside the dashboard for all five period filters on desktop and mobile widths.
- [ ] The chart is taller, while the funnel card is visibly more compact.
- [ ] Each funnel trapezoid centers its stage name and count, with the monetary amount centered below it.
- [ ] Light and dark themes preserve readable grid, labels, line color, and funnel text.
- [ ] All required tests, build, static checks, deployment smoke tests, and documentation updates are complete.
