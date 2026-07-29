# Trend SVG Fill Fix Design

Date: 2026-07-30

## Scope

Fix the black area rendered below the dashboard trend line in the owner demo.
Do not change CRM data, filters, layout, Unovis version, or any earlier phase.

## Cause

`VisLine` creates an SVG `path` without a `fill` attribute and relies on a
runtime Unovis style that sets `fill: none`. In the deployed VibeCode page that
runtime style is not applied, so the browser uses the default black SVG fill.

## Design

- Keep the existing Unovis `VisLine` component and selected-series behavior.
- Add an application-owned CSS rule scoped to `.dashboard-trend-chart` that
  explicitly sets `fill: none` on Unovis SVG paths.
- Keep the existing blue Created line and green Won line, as well as the
  transparent chart surface, neutral grid, axes, and tooltips.
- Add a static regression assertion that the scoped fill rule remains present.

## Verification

- The new regression assertion fails before the CSS rule exists and passes
  after it is added.
- Run the focused frontend quality test, then frontend typecheck, lint, tests,
  build, and secret scan.
- Deploy the existing allowlisted artifact and verify the production graph has
  no filled SVG area in either theme.

## Risks

- The scope must not hide SVG fills belonging to unrelated dashboard graphics.
  The selector is therefore limited to the trend chart component.
- Final browser confirmation remains a manual owner screenshot check.
