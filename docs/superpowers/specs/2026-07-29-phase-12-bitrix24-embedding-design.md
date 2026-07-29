# Phase 12 Bitrix24 Embedding Design

## Goal

Make the production sales dashboard available to the portal owner from the
Bitrix24 left menu and complete the final MVP acceptance checks without
opening the Black Hole server to other users.

## Scope

- Register the OAuth application in the `LEFT_MENU` placement through the
  VibeCode platform handler.
- Keep the Black Hole server access policy as `OWNER_ONLY`.
- Replace the production-only placeholder signed-header handoff with the
  documented Gateway handoff: the backend reads `X-Vibe-Authorization` only
  from the proxy request and resolves the user and portal through server-side
  `GET /v1/me`.
- Preserve browser secrecy: no app key, session token, or gateway header is
  returned to frontend code or written to logs.
- Verify the placement, dashboard defaults, filters, rendered data, CRM
  read-only behavior, and deal navigation for the owner account.
- Record unavailable restricted-user and missing-scope tests as explicit
  external blockers rather than weakening access controls.

## Data Flow

1. The platform binds `LEFT_MENU` to its handler, not directly to the Black
   Hole application URL.
2. Bitrix24 opens the handler. The platform redirects the iframe to the
   production URL and Gateway injects `X-Vibe-Authorization`.
3. The backend extracts the bearer token only from that Gateway header and
   calls VibeCode `/v1/me` using the server-side app key.
4. The backend uses the trusted portal and current-user identity to load the
   existing read-only dashboard DTO endpoints.
5. The frontend calls only same-origin `/api/bootstrap` and `/api/dashboard`.

## Failure Handling

- Missing Gateway handoff returns the existing JSON `AUTH_REQUIRED` response.
- A rejected placement bind is documented with the exact platform prerequisite
  (notably Marketplace subscription) and stops the user-context checks.
- A VibeCode identity failure is handled as an authenticated-session failure;
  the frontend shows its existing error state and no CRM data is returned.
- Restricted-user and missing-scope acceptance are blockers when no safe test
  account or reversible scope-management path is available.

## Verification

- Automated backend tests cover Gateway header parsing, `/v1/me` identity
  resolution, rejected spoofed client headers, and preserved `AUTH_REQUIRED`
  behavior.
- Production smoke covers health, readiness, the left-menu iframe, bootstrap,
  dashboard, default filters, and frontend assets.
- Manual acceptance covers filter changes, KPI/funnel/trend/recent-deal
  rendering, deal-card navigation, iframe widths, and absence of CRM write
  requests.

## Non-Goals

- Do not change server access policy from `OWNER_ONLY`.
- Do not add public access, a custom role model, CRM write operations, or
  direct browser calls to VibeCode CRM APIs.
