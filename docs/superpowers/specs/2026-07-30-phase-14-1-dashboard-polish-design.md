# Phase 14.1: Visual Polish Design

Date: 2026-07-30

## Scope

Phase 14.1 corrects only the visual presentation of the existing owner-demo
dashboard. It does not change CRM queries, aggregation rules, KPI values,
global filters, deployment mode, or any earlier phase.

## Trend

- Keep the existing Unovis implementation and the existing local
  `Created/Won` selector.
- Render exactly one smooth line for the selected series. Do not render an
  area, gradient, or solid fill under the line.
- The chart canvas is transparent against the card surface. Keep thin,
  light-gray grid lines and visible axis labels, following the supplied
  Wildberries reference.
- Use an opaque blue line for `Created` and an opaque green line for `Won`.
  The selected color must remain clear in both light and dark modes.
- Give the chart more vertical space than the current implementation.
- The chart must measure only its available card width. Neither the chart nor
  any built-in date filter (`last7`, `last30`, `last90`, `currentMonth`,
  `previousMonth`) may create horizontal page scrolling or clip the final
  point.

## Funnel

- Retain the layered trapezoid visual funnel and all stages, including stages
  with zero deals.
- Reduce the layer height and inter-layer spacing so the funnel occupies less
  vertical space.
- Center stage name, count, and monetary amount within each layer. The name
  and count use the first centered line; the monetary amount is centered below
  it when present.

## Layout And Themes

- Preserve the Phase 14 desktop one-third/two-thirds analytics layout and the
  existing single-column responsive breakpoint.
- The visual changes apply to light and dark themes. The chart must not show a
  black area in either theme.

## Verification

- Add a regression test that asserts the chart uses a line without `VisArea`.
- Add pure layout tests that retain chart width at or below the measured
  viewport for short and long ranges.
- Add a funnel component test for centered content markers.
- Run backend and frontend test, typecheck, lint, production build, artifact,
  and secret-scan gates. Perform production smoke after deployment.

## Risks

- Unovis SVG styles may differ between light and dark B24UI themes; inspect
  both after deploy.
- Browser screenshot acceptance remains an owner check because no local
  browser automation is installed.
