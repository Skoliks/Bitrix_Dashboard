import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/http/app.js'
import { AppError } from '../../src/http/errors.js'
import type { BootstrapResponse } from '../../src/types/api.js'

const validEnv = {
  VIBECODE_APP_KEY: 'vibe_app_test_secret',
  VIBECODE_API_BASE_URL: 'https://vibecode.example.com',
  BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com',
  APP_PUBLIC_URL: 'https://dashboard.example.com',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  PORT: '0'
}

const bootstrap: BootstrapResponse = {
  categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
  stages: [{ id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process' }],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# ₽', decimals: 2 }],
  users: [],
  timeZone: 'UTC',
  defaults: {
    categoryId: 0,
    currency: 'all',
    period: { from: '2026-06-23', to: '2026-07-22' }
  },
  warnings: []
}

describe('bootstrap route', () => {
  it('returns bootstrap references without exposing secrets', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => bootstrap)
    }
    const app = createApp(validEnv, { referenceDataService })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: {
        origin: 'https://portal.bitrix24.com',
        authorization: 'Bearer vibe_session_secret',
        'x-bitrix24-domain': 'portal.bitrix24.com'
      }
    }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(JSON.parse(body)).toEqual(bootstrap)
    expect(referenceDataService.getBootstrap).toHaveBeenCalledWith({
      portalId: 'portal.bitrix24.com',
      sessionToken: 'vibe_session_secret'
    })
    expect(body).not.toContain('vibe_session_secret')
    expect(body).not.toContain('vibe_app_')
  })

  it('returns blocking validation error when no categories are available', async () => {
    const app = createApp(validEnv, {
      referenceDataService: {
        getBootstrap: vi.fn(async () => {
          throw new AppError('CRM_ACCESS_DENIED', 'No accessible deal categories.', 403)
        })
      }
    })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: {
        origin: 'https://portal.bitrix24.com',
        authorization: 'Bearer vibe_session_secret',
        'x-bitrix24-domain': 'portal.bitrix24.com'
      }
    }))

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: { code: 'CRM_ACCESS_DENIED' }
    })
  })

  it('requires session token before loading bootstrap data', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => bootstrap)
    }
    const app = createApp(validEnv, { referenceDataService })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: {
        origin: 'https://portal.bitrix24.com',
        'x-bitrix24-domain': 'portal.bitrix24.com'
      }
    }))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      error: { code: 'AUTH_REQUIRED' }
    })
    expect(referenceDataService.getBootstrap).not.toHaveBeenCalled()
  })

  it('requires portal id before loading bootstrap data', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => bootstrap)
    }
    const app = createApp(validEnv, { referenceDataService })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: {
        origin: 'https://portal.bitrix24.com',
        authorization: 'Bearer vibe_session_secret'
      }
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' }
    })
    expect(referenceDataService.getBootstrap).not.toHaveBeenCalled()
  })
})
