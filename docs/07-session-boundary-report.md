# Phase 4.5 Session Boundary Report

Дата: 2026-07-23

## Контекст

Независимый аудит Phase 0-4 зафиксировал, что прежний `readSessionContext()` принимал неподписанные клиентские headers `Authorization`, `X-Bitrix24-Domain`, `X-Bitrix24-User-Id` как достаточный пользовательский контекст. CORS не является auth boundary, поэтому этот механизм нельзя считать production-ready.

## Решение Phase 4.5

- Production session context переведен на режим `signed-headers`.
- `signed-headers` принимает только gateway handoff headers:
  - `X-VibeCode-Session-Token`
  - `X-VibeCode-Portal-Domain`
  - `X-VibeCode-User-Id`
  - `X-VibeCode-Session-Issued-At`
  - `X-VibeCode-Session-Signature`
- Подпись проверяется как HMAC-SHA256 по строке:

```text
<sessionToken>
<portalDomain>
<userId>
<issuedAt>
```

- Значение подписи передается как hex или `sha256=<hex>`.
- Секрет подписи задается через `SESSION_CONTEXT_HMAC_SECRET`.
- `SESSION_CONTEXT_MODE=signed-headers` требует `SESSION_CONTEXT_HMAC_SECRET`.
- `provisional-headers` оставлен только для local/dev/test сценариев и явно не является production boundary.

## Cache Isolation

Reference cache теперь использует user dimension, когда user context доступен:

```text
<portalId>:user:<userId>
```

Если `userId` отсутствует, cache остается portal-scoped для обратной совместимости dev/provisional сценариев.

## Проверки

- Forged `Authorization`, `X-Bitrix24-Domain`, `X-Bitrix24-User-Id` в `signed-headers` не дают успешный session context.
- `GET /api/bootstrap` в `signed-headers` не вызывает reference service при forged legacy headers.
- Подписанный gateway handoff принимается.
- Reference cache не смешивает данные двух users одного portal.

## Остаточный Риск

Real Bitrix24 iframe/gateway capture локально не выполнен: точный runtime handoff со стороны VibeCode/Bitrix24 placement нужно подтвердить на реальном placement. Если реальный gateway не может выпускать описанные signed headers или эквивалентный проверяемый marker, перед Phase 5 нужно согласовать адаптер handoff-контракта без возврата к неподписанным client-supplied headers.
