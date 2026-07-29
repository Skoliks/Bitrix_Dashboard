# Trend SVG Fill Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the dashboard trend SVG from receiving the browser's default black fill in either theme.

**Architecture:** Keep the existing Unovis `VisLine` and add an application-owned, chart-scoped CSS fallback for SVG paths. A frontend quality test locks the selector in place so a dependency styling change cannot reintroduce the fill.

**Tech Stack:** Vue 3, `@unovis/vue`, CSS, Vitest, pnpm.

## Global Constraints

- Do not change CRM data, API calls, filters, layout, or the Unovis dependency.
- Keep blue Created and green Won line colors, the transparent chart surface, axes, grid, and tooltips.
- Scope the fallback to `.dashboard-trend-chart`; do not affect the funnel or other SVGs.
- Do not modify, stage, commit, or delete `dashboard-app/src/route-map.d.ts`, `docs/audit.md`, or `screenshots/`.
- Do not put secret values in source, documentation, tests, artifacts, or commits.

---

### Task 1: Lock and Fix SVG Path Fill

**Files:**
- Modify: `dashboard-app/tests/e2e/frontendQuality.spec.ts`
- Modify: `dashboard-app/src/assets/css/main.css`

**Interfaces:**
- Consumes: the existing `.dashboard-trend-chart` root class and Unovis child component marker `[data-vis-component]`.
- Produces: an explicit application-owned SVG fill override for trend paths.

- [ ] **Step 1: Write the failing test**

In `keeps the dashboard trend line-only and bounded by its viewport`, add:

```ts
expect(styles).toMatch(
  /\.dashboard-trend-chart\s+\[data-vis-component\]\s+path\s*\{[^}]*fill:\s*none/s
)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `dashboard-app`:

```powershell
pnpm vitest run tests/e2e/frontendQuality.spec.ts
```

Expected: one failed assertion because `main.css` has no application-owned `fill: none` rule for trend paths.

- [ ] **Step 3: Write the minimal implementation**

In `dashboard-app/src/assets/css/main.css`, add this rule adjacent to the existing `.dashboard-trend-chart` styles:

```css
.dashboard-trend-chart [data-vis-component] path {
  fill: none;
}
```

Do not change `TrendChart.vue`, selected-series colors, axes, dimensions, or grid variables.

- [ ] **Step 4: Run the focused test and verify GREEN**

```powershell
pnpm vitest run tests/e2e/frontendQuality.spec.ts
```

Expected: all quality assertions pass, including the new fill assertion.

- [ ] **Step 5: Commit the implementation**

```powershell
git add dashboard-app/src/assets/css/main.css dashboard-app/tests/e2e/frontendQuality.spec.ts
git commit -m "fix: prevent dashboard trend SVG fill"
```

### Task 2: Verify and Release the Hotfix

**Files:**
- Modify: `docs/06-plan.md`
- Modify: `docs/12.1-owner-demo-report.md`

**Interfaces:**
- Consumes: the existing owner-demo server and allowlisted deployment archive contract.
- Produces: a production release record with local and live verification evidence.

- [ ] **Step 1: Run the complete frontend verification set**

```powershell
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run security:scan
```

Expected: every command exits `0`; record the frontend test count and existing large-chunk warning.

- [ ] **Step 2: Build the allowlisted archive**

```powershell
tar -czf deploy.tar.gz backend/package.json backend/pnpm-lock.yaml backend/dist dashboard-app/dist
tar -tzf deploy.tar.gz
```

Verify the archive includes `backend/dist/index.js` and `dashboard-app/dist/index.html`, and excludes `.env`, `node_modules`, tests, docs, screenshots, logs, and `route-map.d.ts`.

- [ ] **Step 3: Deploy and smoke test**

Deploy to the existing `OWNER_ONLY` VibeCode server with the complete owner-demo env only in the Infra deploy request, because `cleanDeploy` removes `/opt/app/.env`. Use a temporary `api-bearer` token in `try/finally` to verify `/health`, `/ready`, frontend root, bootstrap, and categories `2`, `4`, `6`, and `8`; revoke it and inspect only aggregate log-pattern counts. Manually verify both themes show no black fill.

- [ ] **Step 4: Record release and commit**

Append the work, changed files, verification, deployment result, and manual visual-review risk to `docs/06-plan.md` and `docs/12.1-owner-demo-report.md`.

```powershell
git add docs/06-plan.md docs/12.1-owner-demo-report.md
git commit -m "docs: record trend SVG fill hotfix"
```
