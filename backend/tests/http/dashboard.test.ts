import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import type { Deal } from '../../src/domain/models.js'
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
  stages: [
    { id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process' },
    { id: 'WON', entityId: 'DEAL_STAGE', name: 'Won', sort: 20, semantic: 'success' }
  ],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# RUB', decimals: 2 }],
  users: [{ id: 7, active: true, displayName: 'Manager One', timeZone: 'UTC' }],
  timeZone: 'UTC',
  defaults: {
    categoryId: 0,
    currency: 'all',
    period: { from: '2026-06-23', to: '2026-07-22' }
  },
  warnings: []
}

const deal = (overrides: Partial<Deal> = {}): Deal => ({
  id: 1,
  title: 'Deal',
  amount: 100,
  currency: 'RUB',
  categoryId: 0,
  stageId: 'WON',
  stageSemanticId: 'S',
  assignedById: 7,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  closedAt: '2026-07-02T10:00:00.000Z',
  ...overrides
})

describe('dashboard route', () => {
  it('returns dashboard data and applies category, date and currency filters', async () => {
    const referenceDataService = { getBootstrap: vi.fn(async () => bootstrap) }
    const client = createClient()
    const app = createApp(validEnv, { referenceDataService, vibeCodeClient: client })

    const response = await app.fetch(new Request('http://localhost/api/dashboard?categoryId=0&preset=custom&dateFrom=2026-07-01&dateTo=2026-07-31&currency=RUB', {
      headers: provisionalHeaders()
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      filters: {
        categoryId: 0,
        preset: 'custom',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        currency: 'RUB'
      },
      kpi: {
        openNow: { count: 2 },
        openCreated: { count: 1 },
        won: { count: 1 }
      },
      warnings: []
    })
    expect(referenceDataService.getBootstrap).toHaveBeenCalledWith({
      portalId: 'portal.bitrix24.com',
      sessionToken: 'vibe_session_secret'
    })
    expect(client.aggregateDeals).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({
        filter: expect.objectContaining({
          categoryId: 0,
          currency: 'RUB'
        })
      })
    }))
    expect(client.searchDeals).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: { $gte: '2026-07-01T00:00:00.000Z', $lte: '2026-07-31T23:59:59.999Z' }
        })
      })
    }))
  })

  it('propagates USERS_UNAVAILABLE as a partial dashboard warning', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => ({
        ...bootstrap,
        users: [],
        warnings: [{ code: 'USERS_UNAVAILABLE' as const }]
      }))
    }
    const app = createApp(validEnv, { referenceDataService, vibeCodeClient: createClient() })

    const response = await app.fetch(new Request('http://localhost/api/dashboard', {
      headers: provisionalHeaders()
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.warnings).toContainEqual({ code: 'USERS_UNAVAILABLE' })
  })

  it('uses bootstrap default period when no query period is provided', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-22T05:00:00.000Z'))
    const referenceDataService = { getBootstrap: vi.fn(async () => bootstrap) }
    const client = createClient()
    const app = createApp(validEnv, { referenceDataService, vibeCodeClient: client })

    try {
      const response = await app.fetch(new Request('http://localhost/api/dashboard', {
        headers: provisionalHeaders()
      }))

      expect(response.status).toBe(200)
      expect(client.searchDeals).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          filter: expect.objectContaining({
            createdAt: { $gte: '2026-06-23T00:00:00.000Z', $lte: '2026-07-22T23:59:59.999Z' }
          })
        })
      }))
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns INVALID_FILTERS for invalid query filters without loading deals', async () => {
    const referenceDataService = { getBootstrap: vi.fn(async () => bootstrap) }
    const client = createClient()
    const app = createApp(validEnv, { referenceDataService, vibeCodeClient: client })

    const response = await app.fetch(new Request('http://localhost/api/dashboard?categoryId=999', {
      headers: provisionalHeaders()
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'INVALID_FILTERS' }
    })
    expect(client.aggregateDeals).not.toHaveBeenCalled()
    expect(client.searchDeals).not.toHaveBeenCalled()
  })

  it('returns partial aggregation warning from aggregate meta over HTTP', async () => {
    const referenceDataService = { getBootstrap: vi.fn(async () => bootstrap) }
    const client = createClient()
    client.aggregateDeals = vi
      .fn()
      .mockResolvedValueOnce(aggregate(2, [], true))
      .mockResolvedValueOnce(aggregate(1))
      .mockResolvedValueOnce(aggregate(1))
      .mockResolvedValueOnce(aggregate(1))
    const app = createApp(validEnv, { referenceDataService, vibeCodeClient: client })

    const response = await app.fetch(new Request('http://localhost/api/dashboard', {
      headers: provisionalHeaders()
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.warnings).toContainEqual({ code: 'PARTIAL_AGGREGATION' })
    expect(body.meta.truncatedBlocks).toContain('openNow')
  })

  it('returns expired session as a blocking error', async () => {
    const referenceDataService = {
      getBootstrap: vi.fn(async () => {
        throw new AppError('SESSION_EXPIRED', 'Session expired', 401)
      })
    }
    const app = createApp(validEnv, { referenceDataService, vibeCodeClient: createClient() })

    const response = await app.fetch(new Request('http://localhost/api/dashboard', {
      headers: provisionalHeaders()
    }))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      error: { code: 'SESSION_EXPIRED' }
    })
  })

  it('requires signed session handoff in signed mode', async () => {
    const referenceDataService = { getBootstrap: vi.fn(async () => bootstrap) }
    const app = createApp({
      ...validEnv,
      SESSION_CONTEXT_MODE: 'signed-headers',
      SESSION_CONTEXT_HMAC_SECRET: 'server-secret'
    }, { referenceDataService, vibeCodeClient: createClient() })

    const forged = await app.fetch(new Request('http://localhost/api/dashboard', {
      headers: provisionalHeaders()
    }))
    const signed = await app.fetch(new Request('http://localhost/api/dashboard', {
      headers: signedHeaders()
    }))

    expect(forged.status).toBe(401)
    expect(signed.status).toBe(200)
  })
})

const aggregate = (count: number, groups = [] as Array<{ stageId?: string; count: number; aggregates: Record<string, unknown> }>, truncated = false) => ({
  count,
  aggregates: {},
  groups,
  meta: { totalRecords: count, recordsProcessed: count, truncated }
})

const createClient = (overrides = {}) => ({
  getDeals: vi.fn(),
  getDealCategories: vi.fn(),
  getStatuses: vi.fn(),
  getUsers: vi.fn(),
  getCurrencies: vi.fn(),
  aggregateDeals: vi
    .fn()
    .mockResolvedValueOnce(aggregate(2))
    .mockResolvedValueOnce(aggregate(1))
    .mockResolvedValueOnce(aggregate(1))
    .mockResolvedValueOnce(aggregate(1, [{ stageId: 'WON', count: 1, aggregates: {} }]))
    .mockResolvedValue(aggregate(0)),
  searchDeals: vi
    .fn()
    .mockResolvedValueOnce([deal({ id: 1, stageId: 'WON', stageSemanticId: 'S' })])
    .mockResolvedValueOnce([deal({ id: 1, stageId: 'WON', stageSemanticId: 'S' })])
    .mockResolvedValueOnce([deal({ id: 1, title: 'Recent' })])
    .mockResolvedValue([]),
  ...overrides
})

const provisionalHeaders = () => ({
  origin: 'https://portal.bitrix24.com',
  authorization: 'Bearer vibe_session_secret',
  'x-bitrix24-domain': 'portal.bitrix24.com'
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
