# Dashboard Data And UI Design

**Date:** 2026-07-29

## Scope

This design introduces two follow-up phases for the private owner demo only.
It does not change the Phase 12 client-placement scope, create CRM records, or
change `dashboard-app/src/route-map.d.ts`, `docs/audit.md`, or `screenshots/`.

## Phase 13: CRM Data Accuracy And Freshness

### Goal

Make the selected pipeline, KPI, funnel, recent deals, and trend consistently
reflect the same current CRM data and the same global filters.

### Required Behaviour

- Reproduce the dashboard response for pipelines 2, 4, 6, and 8 using a
  short-lived technical access token and retain no CRM payload in repository
  files, tests, logs, or documentation.
- Find and correct the cause of a stale or empty trend after changing the
  selected pipeline.
- Validate the successful-deal predicate against pipeline, successful stage,
  close date, currency, and amount. The winner count and total won amount must
  match the CRM for the selected pipeline and period.
- Keep period and currency as global filters for KPI, funnel, recent deals,
  and trend, even though their controls will move beside the trend in Phase 14.
- Keep the existing average-ticket calculation unchanged. It is accepted as
  correct and is explicitly out of scope for this phase.
- Keep the 500-deal snapshot safeguard. A snapshot at that bound must remain
  marked with `PARTIAL_AGGREGATION` and `truncatedBlocks: ['snapshot']`.

### Verification

- Backend regression tests for selected pipeline changes, successful-deal
  totals, and last-period trend values.
- Production smoke for pipelines 2, 4, 6, and 8, including selected stage
  references and trend changes; only status, counts, and required identifiers
  are inspected.
- Temporary production access tokens are revoked and post-deploy logs are
  scanned for request failures and credential patterns.

## Phase 14: Light UI And Readable Analytics

### Layout

- Use the light theme by default. A top-right icon button shows a moon in light
  mode to switch to dark mode and a sun in dark mode to switch back. The user
  preference persists between visits.
- Remove the dashboard application's internal left sidebar. This does not
  affect the Bitrix24 navigation surrounding the application.
- The top application toolbar contains the pipeline selector and theme toggle.
  Period and currency controls move into the trend panel header but continue to
  filter the entire dashboard.
- The stage block becomes a compact visual funnel. Each colored layer shows
  stage name, deal count, and stage amount.
- On desktop the funnel uses roughly one third of the analytics row and the
  trend uses roughly two thirds. On mobile the panels stack vertically.

### Trend

- Replace grouped bars with one smooth line and a subtle area fill, following
  the readability of the supplied Wildberries reference.
- A local trend control selects exactly one series: `Created` or `Won`.
  `Created` is the default.
- Hover tooltip contains the period, deal count, and won amount when the
  selected series is `Won`.
- Use daily points for short ranges and aggregate longer ranges so labels and
  the line remain readable. Zero periods remain visible.
- The trend represents deal creations or successful closings over time. It is
  not a historical stage-transition chart because the current CRM contract does
  not provide a safe source for per-stage history.

### Verification

- Frontend tests for theme persistence, global filter placement/behaviour, the
  selected trend series, zero periods, and currency formatting.
- Desktop and mobile visual checks confirm that the trend dominates the row,
  labels fit, and no dashboard-internal sidebar remains.
- Full local lint, typecheck, tests, production build, artifact check, and
  secret scan before deployment.

## Risks

- Phase 13 may show that the data mismatch originates in upstream CRM field
  mapping or historical records rather than dashboard aggregation. The fix must
  be based on the recorded API contract and protected by regression tests.
- The 500-record cap deliberately preserves a partial-data warning until a
  future pagination design is approved.
- Phase 14 improves the owner demo only. It does not complete Phase 12 client
  placement, per-user CRM rights, or Marketplace subscription requirements.
