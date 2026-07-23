# Phase 8. Local Integration

This run connects `dashboard-app/` to the local `backend/` through the Vite dev server. The frontend keeps using relative `/api/*` URLs, so browser traffic does not call VibeCode directly.

## Ports

- Backend: `http://127.0.0.1:3000`
- Frontend: `http://127.0.0.1:5173`
- Vite proxy target: `VITE_BFF_PROXY_TARGET`, defaults to `http://127.0.0.1:3000`

## Backend env keys

Create `backend/.env` from `backend/.env.example` and set values locally. Do not commit real values. Prefer copying the example file; do not create `.env` with Windows PowerShell `Set-Content -Encoding UTF8` in Windows PowerShell 5, because it writes a BOM and Node can treat the first key as a different name.

- `VIBECODE_APP_KEY`
- `VIBECODE_API_BASE_URL`
- `BITRIX24_ALLOWED_ORIGINS`
- `LOCAL_FRONTEND_ALLOWED_ORIGINS`
- `APP_PUBLIC_URL`
- `NODE_ENV`
- `SESSION_CONTEXT_MODE`
- `SESSION_CONTEXT_HMAC_SECRET`
- `LOG_LEVEL`
- `PORT`

For local dashboard development, include these origins:

```text
LOCAL_FRONTEND_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
APP_PUBLIC_URL=http://127.0.0.1:5173
PORT=3000
```

`LOCAL_FRONTEND_ALLOWED_ORIGINS` is ignored when `NODE_ENV=production`; production CORS remains controlled by `BITRIX24_ALLOWED_ORIGINS`.

## Frontend env keys

Create `dashboard-app/.env.local` only when overriding defaults.

- `VITE_BFF_PROXY_TARGET`
- `VITE_ALLOWED_HOSTS`
- `VITE_DASHBOARD_MOCK_MODE`

For local backend integration:

```text
VITE_BFF_PROXY_TARGET=http://127.0.0.1:3000
VITE_DASHBOARD_MOCK_MODE=false
```

Leave `VITE_BFF_BASE_URL` unset for this smoke test. The frontend should request `/api/bootstrap` and `/api/dashboard`, and Vite should proxy those requests to the backend.

## Run

Terminal 1:

```powershell
cd backend
Copy-Item .env.example .env
pnpm run dev:local
```

`pnpm run dev:local` reads `backend/.env` through Node `--env-file-if-exists=.env`. Values already exported in the shell can still be used.

Terminal 2:

```powershell
cd dashboard-app
pnpm run dev:local
```

Open `http://127.0.0.1:5173`.

## Smoke Checks

From the frontend dev server:

```powershell
function Invoke-ApiSmoke($url) {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing
  } catch [System.Net.WebException] {
    $response = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    [pscustomobject]@{
      Status = [int]$response.StatusCode
      ContentType = $response.Headers['Content-Type']
      Body = $reader.ReadToEnd()
    }
  }
}

Invoke-ApiSmoke http://127.0.0.1:5173/api/bootstrap
Invoke-ApiSmoke http://127.0.0.1:5173/api/dashboard
```

Expected result with a valid local VibeCode app key and session context: both requests are served by `backend/` and return JSON. Without a valid VibeCode session or signed/dev session headers, the backend can return an auth/session error; that still proves the Vite proxy path is wired, but it does not prove real dashboard data is available.

## Known Limitations

- Vite proxy can hide production CORS and deployment security issues; deploy validation still needs a real hosted origin.
- Local env can differ from Black Hole runtime variables.
- Real VibeCode data requires a valid app key and a session context. Use a signed fixture/dev session locally, or treat missing session credentials as a blocker for data-level smoke.
