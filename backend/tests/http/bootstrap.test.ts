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
  SESSION_CONTEXT_MODE: 'provisional-headers',
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

  it('resolves the Gateway session before loading bootstrap data', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => bootstrap)
    }
    const client = createClient({
      getCurrentUser: vi.fn(async () => ({ portal: 'portal.bitrix24.com', userId: '42' }))
    })
    const app = createApp({
      ...validEnv,
      SESSION_CONTEXT_MODE: 'gateway-headers'
    }, { referenceDataService, vibeCodeClient: client })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: {
        origin: 'https://portal.bitrix24.com',
        'x-vibe-authorization': 'Bearer vibe_session_gateway',
        'x-vibe-user-id': '42'
      }
    }))

    expect(response.status).toBe(200)
    expect(client.getCurrentUser).toHaveBeenCalledWith({ sessionToken: 'vibe_session_gateway' })
    expect(referenceDataService.getBootstrap).toHaveBeenCalledWith({
      portalId: 'portal.bitrix24.com',
      sessionToken: 'vibe_session_gateway',
      userId: '42'
    })
  })

  it('loads bootstrap through owner demo mode without browser credentials', async () => {
    const referenceDataService = { getBootstrap: vi.fn(async () => bootstrap) }
    const client = createClient({
      getKeyPortal: vi.fn(async () => ({ portal: 'portal.bitrix24.com' }))
    })
    const app = createApp({
      ...validEnv,
      NODE_ENV: 'production',
      VIBECODE_APP_KEY: undefined,
      VIBECODE_API_KEY: 'vibe_api_owner_secret',
      VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech',
      SESSION_CONTEXT_MODE: 'owner-api-key',
      OWNER_DEMO_PORTAL: 'portal.bitrix24.com'
    }, { referenceDataService, vibeCodeClient: client })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: { origin: 'https://portal.bitrix24.com' }
    }))

    expect(response.status).toBe(200)
    expect(client.getKeyPortal).toHaveBeenCalledOnce()
    expect(client.getCurrentUser).not.toHaveBeenCalled()
    expect(referenceDataService.getBootstrap).toHaveBeenCalledWith({ portalId: 'portal.bitrix24.com' })
  })

  it('rejects forged provisional headers when signed mode is enabled', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => bootstrap)
    }
    const app = createApp({
      ...validEnv,
      SESSION_CONTEXT_MODE: 'signed-headers',
      SESSION_CONTEXT_HMAC_SECRET: 'server-secret'
    }, { referenceDataService })

    const response = await app.fetch(new Request('http://localhost/api/bootstrap', {
      headers: {
        origin: 'https://portal.bitrix24.com',
        authorization: 'Bearer forged_session',
        'x-bitrix24-domain': 'evil.bitrix24.com',
        'x-bitrix24-user-id': '99'
      }
    }))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      error: { code: 'AUTH_REQUIRED' }
    })
    expect(referenceDataService.getBootstrap).not.toHaveBeenCalled()
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

const createClient = (overrides = {}) => ({
  getKeyPortal: vi.fn(),
  getCurrentUser: vi.fn(),
  getDeals: vi.fn(),
  searchDeals: vi.fn(),
  aggregateDeals: vi.fn(),
  getDealCategories: vi.fn(),
  getStatuses: vi.fn(),
  getUsers: vi.fn(),
  getCurrencies: vi.fn(),
  ...overrides
})
