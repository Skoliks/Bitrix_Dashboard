import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/http/app.js'
import { AppError } from '../../src/http/errors.js'
import type { BootstrapResponse } from '../../src/types/api.js'

const env = {
  VIBECODE_APP_KEY: 'vibe_app_test_secret',
  VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech',
  BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com',
  APP_PUBLIC_URL: 'https://dashboard.example.com',
  NODE_ENV: 'production',
  SESSION_CONTEXT_MODE: 'signed-headers',
  SESSION_CONTEXT_HMAC_SECRET: 'server-secret',
  LOG_LEVEL: 'silent',
  PORT: '0'
}

const bootstrap: BootstrapResponse = {
  categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
  stages: [{ id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process' }],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# RUB', decimals: 2 }],
  users: [],
  timeZone: 'UTC',
  defaults: {
    categoryId: 0,
    currency: 'all',
    period: { from: '2026-06-23', to: '2026-07-22' }
  },
  warnings: []
}

describe('phase 9 backend quality gates', () => {
  it('applies CORS and iframe-safe security headers for allowed origins', async () => {
    const app = createApp(env, {
      referenceDataService: { getBootstrap: vi.fn(async () => bootstrap) },
      vibeCodeClient: createClient()
    })

    const response = await app.fetch(new Request('https://dashboard.example.com/health', {
      headers: { origin: 'https://portal.bitrix24.com' }
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://portal.bitrix24.com')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('content-security-policy')).toContain('frame-ancestors')
    expect(response.headers.has('x-frame-options')).toBe(false)
  })

  it('rejects invalid filters before deal data is loaded', async () => {
    const client = createClient()
    const app = createApp(env, {
      referenceDataService: { getBootstrap: vi.fn(async () => bootstrap) },
      vibeCodeClient: client
    })

    const response = await app.fetch(new Request('https://dashboard.example.com/api/dashboard?categoryId=404', {
      headers: signedHeaders()
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_FILTERS' } })
    expect(client.aggregateDeals).not.toHaveBeenCalled()
    expect(client.searchDeals).not.toHaveBeenCalled()
  })

  it('keeps blocking errors sanitized and correlated by request id', async () => {
    const app = createApp(env, {
      referenceDataService: {
        getBootstrap: vi.fn(async () => {
          throw new AppError('UPSTREAM_UNAVAILABLE', 'Raw CRM payload vibe_session_secret Deal #42 ivan@example.com', 502)
        })
      },
      vibeCodeClient: createClient()
    })

    const response = await app.fetch(new Request('https://dashboard.example.com/api/bootstrap', {
      headers: {
        ...signedHeaders(),
        'x-request-id': 'qa-request-1'
      }
    }))
    const bodyText = await response.text()

    expect(response.status).toBe(502)
    expect(response.headers.get('x-request-id')).toBe('qa-request-1')
    expect(bodyText).toContain('qa-request-1')
    expect(bodyText).not.toContain('vibe_session_secret')
    expect(bodyText).not.toContain('ivan@example.com')
    expect(bodyText).not.toContain('Deal #42')
  })
})

const createClient = () => ({
  getCurrentUser: vi.fn(),
  getDeals: vi.fn(),
  getDealCategories: vi.fn(),
  getStatuses: vi.fn(),
  getUsers: vi.fn(),
  getCurrencies: vi.fn(),
  aggregateDeals: vi.fn().mockResolvedValue({ count: 0, aggregates: {}, groups: [], meta: { totalRecords: 0, recordsProcessed: 0, truncated: false } }),
  searchDeals: vi.fn().mockResolvedValue([])
})

const signedHeaders = () => {
  const sessionToken = 'vibe_session_secret'
  const portalDomain = 'portal.bitrix24.com'
  const userId = '42'
  const issuedAt = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', 'server-secret')
    .update(`${sessionToken}\n${portalDomain}\n${userId}\n${issuedAt}`)
    .digest('hex')

  return {
    origin: 'https://portal.bitrix24.com',
    'x-vibecode-session-token': sessionToken,
    'x-vibecode-portal-domain': portalDomain,
    'x-vibecode-user-id': userId,
    'x-vibecode-session-issued-at': issuedAt,
    'x-vibecode-session-signature': `sha256=${signature}`
  }
}
