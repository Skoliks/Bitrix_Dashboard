# Dashboard Data Accuracy Design

Date: 2026-07-29

## Goal

Make the private owner-demo dashboard show the selected pipeline's current
stages, deals, counts, trend, and money values accurately. The change is
limited to the dashboard backend and frontend. It does not create, modify, or
delete CRM records.

## Confirmed Decisions

- The dashboard loads stage references for the pipeline selected in the filter.
- For a selected pipeline, the backend loads up to 500 full deal records once
  and computes date-bound dashboard values locally from their actual timestamps.
  This avoids the observed VibeCode CRM date-filter behavior that omits records
  created on the final calendar day of a range.
- All counts for the period, funnel, trend, and recent-deals table use that same
  snapshot. `Open now` also uses the snapshot so all cards describe one data
  set.
- A deal is treated as won only when its stage semantic is successful. A
  planned `closedAt` date on an open deal does not make it a won deal.
- The trend chart shows daily grouped bars for `Created` and `Won`. It contains
  zero-value days across the chosen range, so it does not draw misleading
  diagonal lines between unrelated dates.
- Currency format strings decode numeric HTML entities before rendering. The
  intended ruble symbol renders instead of the literal `&#8381;` text.

## Data Flow

1. The backend loads cached pipeline, currency, and user references.
2. It validates the requested filter, then loads and caches the stages for the
   requested pipeline, not merely the default pipeline.
3. It requests a full, allowlisted deal projection for that pipeline with
   `limit=500` and no upstream date filter.
4. Backend aggregation filters the snapshot against exact portal-timezone
   `startAt` and `endAt` boundaries and derives KPIs, funnel rows, trend points,
   and the recent-deals table from it.
5. The existing dashboard DTO remains the frontend contract. The frontend only
   changes its trend renderer and currency text formatter.

## Partial Data Handling

The snapshot is bounded to 500 deals. When exactly 500 records are returned,
the response includes the existing partial-data warning and identifies the
snapshot-derived blocks as partial. This prevents silently presenting a full
result for a larger pipeline.

## Tests And Verification

- Backend tests cover selected-pipeline stage references, last-day deals,
  successful-stage-only won metrics, local funnel/KPI aggregation, and the
  500-record partial warning.
- Frontend tests cover ruble entity decoding and daily grouped trend data.
- Production smoke covers all three demo pipelines, the original pipeline,
  refreshed data, CORS, and absence of backend request failures in runtime
  logs.

## Risks

- Pipelines with 500 or more deals are deliberately marked partial until the
  VibeCode CRM API provides reliable paginated or exact date aggregation for
  this use case.
- The chart is limited to the selected dashboard period; it is not intended as
  a long-range warehouse analytics report.
