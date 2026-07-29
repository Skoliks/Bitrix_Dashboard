# Phase 12.1 Owner Demo Design

## Goal

Temporarily make the existing production dashboard show CRM data from the
owner's Bitrix24 portal so the owner can capture truthful product screenshots,
without requiring a VibeCode Marketplace placement or weakening the future
per-user Gateway integration.

## Scope

- Add a production-only `owner-api-key` session-context mode.
- Use a server-side personal VibeCode API key only in that mode.
- Resolve and validate one configured portal server-side; do not accept a
  portal, user, session, or API key from browser requests.
- Keep the Black Hole server policy as `OWNER_ONLY` while the mode is active.
- Preserve the existing `gateway-headers` mode for future Bitrix24 placement
  integration and document an explicit rollback deploy profile.
- Create a Phase 12.1 report with screenshot and smoke evidence, but never
  store keys, tokens, raw CRM data, or screenshots containing CRM data in Git.

## Non-Goals

- This mode is not multi-user, client-facing, or a substitute for local
  Bitrix24 application integration.
- Do not bind a left-menu placement, change CRM permissions, or perform CRM
  writes.
- Do not change the server access policy to public access.
- Do not add browser-side VibeCode authentication or direct CRM API calls.

## Configuration Model

The backend will have two mutually exclusive production profiles:

| Profile | Session mode | Required server-side key | Data identity |
| --- | --- | --- | --- |
| Future client integration | `gateway-headers` | OAuth application key | Current Bitrix24 user injected by Gateway |
| Private screenshot demo | `owner-api-key` | Personal VibeCode API key | Owner of that API key |

The owner-demo profile must require all of the following server-side settings:

- `SESSION_CONTEXT_MODE=owner-api-key`
- `VIBECODE_API_KEY` with a personal `vibe_api_` key
- `OWNER_DEMO_PORTAL` equal to the configured Bitrix24 portal domain
- `NODE_ENV=production`

It must reject `owner-api-key` when the portal does not match the configured
Bitrix24 origin. The value is never included in public readiness data, logs,
API responses, frontend assets, or repository files.

## Data Flow

1. The owner signs in to VibeCode and opens the existing `OWNER_ONLY` public
   URL.
2. The browser calls same-origin `/api/bootstrap` and `/api/dashboard` without
   sending any VibeCode or Bitrix24 credential.
3. In `owner-api-key` mode, the backend creates a trusted fixed request context
   from configuration, not request headers.
4. The server-side VibeCode client sends its personal API key in `X-Api-Key`
   and no user bearer token. It calls the existing read-only CRM endpoints.
5. Existing DTO, filtering, KPI, funnel, trend, and recent-deal logic remains
   unchanged. The frontend receives only the existing normalized API response.

## Backend Boundaries

- Generalize the VibeCode client configuration from an app-key-specific name to
  a server-side API credential while preserving the header contract.
- Add a key-identity method for `/v1/me` that resolves the trusted portal for a
  personal key without requiring `currentUser`.
- Extend session resolution with an owner-demo branch that returns the
  configured portal and no browser-provided session token.
- Keep the Gateway branch unchanged: it continues to require
  `X-Vibe-Authorization` and resolves the real user through `/v1/me`.
- The backend must fail closed with JSON configuration or authentication errors
  when the owner-demo environment is incomplete or inconsistent.

## Security Controls

- The personal key exists only in Black Hole server environment storage.
- The server remains `OWNER_ONLY`; no share URL or public policy is used.
- No request header can select a different portal or impersonate a user.
- Runtime logging remains sanitized and must not log request headers, CRM
  payloads, keys, or token-shaped strings.
- The owner-demo profile is documented as temporary and is reverted before any
  client or shared-user deployment.

## Verification

- Config tests: valid owner-demo profile, missing key, missing portal, portal
  mismatch, and preserved Gateway requirements.
- Session tests: owner-demo ignores forged authorization and Bitrix24 headers;
  Gateway behavior remains unchanged.
- HTTP tests: bootstrap and dashboard use the fixed owner context; no browser
  credential is required in this profile.
- Full backend lint, typecheck, and test suite; frontend tests, production
  build, artifact check, and secret scans.
- Deploy to the existing `OWNER_ONLY` server, then run health, readiness,
  bootstrap, dashboard, and log-hygiene smoke with a short-lived technical
  access token. Record only status, counts, and DTO shape, not CRM contents.
- The owner manually captures screenshots after confirming dashboard data and
  filters render correctly.

## Rollback

Before the owner-demo deploy, record the current Gateway profile without secret
values. To return to future client integration, redeploy the same artifact with
`SESSION_CONTEXT_MODE=gateway-headers`, the OAuth application key, and no
owner-demo variables. Verify that unauthenticated dashboard API calls again
return `401 AUTH_REQUIRED`.

## Risks

- The personal API key reads data as its owner, so this profile must never be
  exposed to other users or used for a client delivery.
- Rotating a previously chat-shared personal key is required before any longer
  use of the mode.
- A Black Hole service restart or deploy keeps the mode only if its server-side
  environment is deliberately supplied again; no credential is persisted in
  source code or build artifacts.
