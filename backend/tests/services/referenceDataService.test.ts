import { describe, expect, it, vi } from 'vitest'

import type { VibeCodeClient } from '../../src/vibecode/client.js'
import { AppError } from '../../src/http/errors.js'
import { MemoryCache } from '../../src/services/cache.js'
import { createReferenceDataService } from '../../src/services/referenceDataService.js'

const categories = [
  { id: 1, name: 'Secondary', sort: 20, isLocked: false },
  { id: 0, name: 'Main', sort: 10, isLocked: false }
]

const stages = [
  { id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process' },
  { id: 'WON', entityId: 'DEAL_STAGE', name: 'Won', sort: 20, semantic: 'success' }
]

const currencies = [
  { id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# ₽', decimals: 2 }
]

const users = [
  { id: 1, active: true, displayName: 'User One', timeZone: 'Asia/Yakutsk' }
]

const createClient = (overrides: Partial<VibeCodeClient> = {}): VibeCodeClient => ({
  getKeyPortal: vi.fn(),
  getCurrentUser: vi.fn(),
  getDeals: vi.fn(),
  searchDeals: vi.fn(),
  aggregateDeals: vi.fn(),
  getDealCategories: vi.fn(async () => categories),
  getStatuses: vi.fn(async () => stages),
  getCurrencies: vi.fn(async () => currencies),
  getUsers: vi.fn(async () => users),
  ...overrides
})

describe('reference data service', () => {
  it('loads bootstrap references, main pipeline stages, defaults and portal-scoped cache', async () => {
    const client = createClient()
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(() => Date.UTC(2026, 6, 22)),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    const first = await service.getBootstrap({
      portalId: 'portal-a',
      sessionToken: 'vibe_session_secret'
    })
    const second = await service.getBootstrap({
      portalId: 'portal-a',
      sessionToken: 'vibe_session_secret'
    })

    expect(first.categories.map(category => category.id)).toEqual([0, 1])
    expect(first.stages).toEqual(stages)
    expect(first.currencies).toEqual(currencies)
    expect(first.users).toEqual(users)
    expect(first.timeZone).toBe('Asia/Yakutsk')
    expect(first.defaults).toEqual({
      categoryId: 0,
      currency: 'all',
      period: {
        from: '2026-06-23',
        to: '2026-07-22'
      }
    })
    expect(first.warnings).toEqual([])
    expect(client.getStatuses).toHaveBeenCalledWith({
      entityId: 'DEAL_STAGE',
      sessionToken: 'vibe_session_secret'
    })
    expect(second).toEqual(first)
    expect(client.getDealCategories).toHaveBeenCalledTimes(1)
    expect(client.getStatuses).toHaveBeenCalledTimes(1)
  })

  it('isolates reference cache by user when user context is available', async () => {
    const client = createClient({
      getDealCategories: vi
        .fn()
        .mockResolvedValueOnce([{ id: 0, name: 'Main for user 1', sort: 10, isLocked: false }])
        .mockResolvedValueOnce([{ id: 0, name: 'Main for user 2', sort: 10, isLocked: false }]),
      getUsers: vi
        .fn()
        .mockResolvedValueOnce([{ id: 1, active: true, displayName: 'User One', timeZone: 'UTC' }])
        .mockResolvedValueOnce([{ id: 2, active: true, displayName: 'User Two', timeZone: 'UTC' }])
    })
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(() => Date.UTC(2026, 6, 22)),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    const first = await service.getBootstrap({
      portalId: 'portal-a',
      userId: '1',
      sessionToken: 'session-1'
    })
    const second = await service.getBootstrap({
      portalId: 'portal-a',
      userId: '2',
      sessionToken: 'session-2'
    })

    expect(first.categories[0]?.name).toBe('Main for user 1')
    expect(second.categories[0]?.name).toBe('Main for user 2')
    expect(client.getDealCategories).toHaveBeenCalledTimes(2)
    expect(client.getUsers).toHaveBeenCalledTimes(2)
  })

  it('uses first available category and category-specific stages when main category is absent', async () => {
    const client = createClient({
      getDealCategories: vi.fn(async () => [{ id: 2, name: 'Only', sort: 30, isLocked: false }])
    })
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    const bootstrap = await service.getBootstrap({ portalId: 'portal-b' })

    expect(bootstrap.defaults.categoryId).toBe(2)
    expect(client.getStatuses).toHaveBeenCalledWith({ entityId: 'DEAL_STAGE_2' })
  })

  it('loads stage references for a requested available pipeline', async () => {
    const client = createClient({
      getDealCategories: vi.fn(async () => [
        { id: 2, name: 'Projects', sort: 10, isLocked: false },
        { id: 4, name: 'Automation', sort: 20, isLocked: false }
      ]),
      getStatuses: vi.fn(async ({ entityId }: { entityId: string }) => [
        { id: 'C4:NEW', entityId, name: 'New automation deal', sort: 10, semantic: 'process' }
      ])
    })
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    const bootstrap = await service.getBootstrap({ portalId: 'portal-selected', categoryId: 4 })

    expect(bootstrap.defaults.categoryId).toBe(4)
    expect(bootstrap.stages).toMatchObject([{ id: 'C4:NEW', entityId: 'DEAL_STAGE_4' }])
    expect(client.getStatuses).toHaveBeenCalledWith({ entityId: 'DEAL_STAGE_4' })
  })

  it('returns USERS_UNAVAILABLE warning when users endpoint fails', async () => {
    const client = createClient({
      getUsers: vi.fn(async () => {
        throw new AppError('SCOPE_DENIED', 'No users scope', 403)
      })
    })
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    const bootstrap = await service.getBootstrap({ portalId: 'portal-c' })

    expect(bootstrap.users).toEqual([])
    expect(bootstrap.warnings).toEqual([{ code: 'USERS_UNAVAILABLE' }])
  })

  it('does not hide auth failures from users endpoint', async () => {
    const client = createClient({
      getUsers: vi.fn(async () => {
        throw new AppError('SESSION_EXPIRED', 'Session expired', 401)
      })
    })
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    await expect(service.getBootstrap({ portalId: 'portal-d' })).rejects.toMatchObject({
      code: 'SESSION_EXPIRED'
    })
  })

  it('falls back to UTC when user timezone is invalid', async () => {
    const client = createClient({
      getUsers: vi.fn(async () => [{ id: 3, active: true, displayName: 'Bad TZ', timeZone: 'Invalid/Zone' }])
    })
    const service = createReferenceDataService({
      client,
      cache: new MemoryCache(),
      now: () => new Date('2026-07-22T05:00:00.000Z')
    })

    const bootstrap = await service.getBootstrap({ portalId: 'portal-e' })

    expect(bootstrap.timeZone).toBe('UTC')
    expect(bootstrap.defaults.period).toEqual({
      from: '2026-06-23',
      to: '2026-07-22'
    })
  })
})
