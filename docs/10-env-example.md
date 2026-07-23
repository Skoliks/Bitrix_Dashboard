# Phase 10 Env Example

Дата: 2026-07-23

Этот файл фиксирует production env profile без значений секретов. Значения с `replace_with_...` задаются только в server-side окружении хостинга и не попадают во frontend bundle.

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DEPLOYMENT_VERSION=replace_with_commit_or_release_id

APP_PUBLIC_URL=https://replace-with-public-app-url.example.com
BITRIX24_ALLOWED_ORIGINS=https://replace-with-portal.bitrix24.com

VIBECODE_API_BASE_URL=https://vibecode.bitrix24.tech
VIBECODE_APP_KEY=replace_with_server_side_vibe_app_key

SESSION_CONTEXT_MODE=signed-headers
SESSION_CONTEXT_HMAC_SECRET=replace_with_gateway_handoff_hmac_secret

FRONTEND_DIST_DIR=../dashboard-app/dist
```

## Notes

- `VIBECODE_APP_KEY` и `SESSION_CONTEXT_HMAC_SECRET` являются server-side secrets. Их нельзя добавлять в `dashboard-app/.env*`, `VITE_*`, frontend source, build artifact, логи или docs с реальными значениями.
- `DEPLOYMENT_VERSION` должен совпадать с commit SHA, release id или artifact id. Backend возвращает его в `GET /health` и `GET /ready`.
- `BITRIX24_ALLOWED_ORIGINS` принимает comma-separated список origins порталов Битрикс24. В production wildcard origins не используются.
- `SESSION_CONTEXT_MODE=signed-headers` является production режимом. `provisional-headers` остается dev/test fallback и не должен включаться на production хостинге.
- `FRONTEND_DIST_DIR` можно не задавать, если backend запускается из `backend/` и frontend build лежит в `../dashboard-app/dist`. Для хостинга с другой раскладкой указывать абсолютный путь.

## Secret Rotation

1. Выпустить новый `VIBECODE_APP_KEY` или `SESSION_CONTEXT_HMAC_SECRET` в Bitrix24/VibeCode/Gateway стороне.
2. Обновить secret в server-side настройках хостинга без изменения frontend env.
3. Перезапустить backend deployment и проверить `GET /health`, `GET /ready`, затем `/api/bootstrap` в тестовом пользовательском контексте.
4. Отозвать старый secret после успешного smoke.
5. Запустить `pnpm run security:scan` и `pnpm run artifact:check`, чтобы подтвердить, что secret не попал в build output.
