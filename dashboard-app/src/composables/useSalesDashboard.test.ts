import { describe, expect, it, vi } from 'vitest'

import type { BootstrapResponse, DashboardResponse } from '../types/dashboard'
import { createSalesDashboardState } from './useSalesDashboard'

const bootstrap: BootstrapResponse = {
  categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
  stages: [{ id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process' }],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# RUB', decimals: 2 }],
  users: [],
  timeZone: 'UTC',
  defaults: { categoryId: 0, currency: 'all', period: { from: '2026-07-01', to: '2026-07-31' } },
  warnings: []
}

const dashboard = (count: number, warnings: DashboardResponse['warnings'] = []): DashboardResponse => ({
  filters: { categoryId: 0, preset: 'last30', currency: 'all' },
  references: { categories: bootstrap.categories, stages: bootstrap.stages, currencies: bootstrap.currencies, users: [], timeZone: 'UTC' },
  kpi: { openNow: { count, amountsByCurrency: [] }, openCreated: { count: 0 }, won: { count: 0 }, wonAmountByCurrency: [], averageWonAmountByCurrency: [] },
  stageFunnel: [],
  trend: { bucket: 'day', points: [] },
  recentDeals: [],
  warnings,
  meta: { partialAggregation: false, truncatedBlocks: [], totalRecords: 0, recordsProcessed: 0 }
})

describe('useSalesDashboard state', () => {
  it('starts in initial loading state before first request', () => {
    const state = createSalesDashboardState({
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi.fn(async () => dashboard(3))
    })

    expect(state.status.value).toBe('initial')
    expect(state.isLoading.value).toBe(true)
  })

  it('transitions from initial loading to ready', async () => {
    const state = createSalesDashboardState({
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi.fn(async () => dashboard(3))
    })

    const promise = state.load()
    expect(state.status.value).toBe('loading')
    await promise

    expect(state.status.value).toBe('ready')
    expect(state.dashboard.value?.kpi.openNow.count).toBe(3)
    expect(state.warnings.value).toEqual([])
  })

  it('keeps previous data while refresh is running', async () => {
    let resolveRefresh: (value: DashboardResponse) => void = () => undefined
    const api = {
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(dashboard(1))
        .mockImplementationOnce(async () => new Promise<DashboardResponse>(resolve => { resolveRefresh = resolve }))
    }
    const state = createSalesDashboardState(api)

    await state.load()
    const refresh = state.refresh({ currency: 'RUB' })

    expect(state.status.value).toBe('refreshing')
    expect(state.dashboard.value?.kpi.openNow.count).toBe(1)

    resolveRefresh(dashboard(2))
    await refresh

    expect(state.status.value).toBe('ready')
    expect(state.dashboard.value?.kpi.openNow.count).toBe(2)
  })

  it('marks empty dashboard responses as empty', async () => {
    const state = createSalesDashboardState({
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi.fn(async () => dashboard(0))
    })

    await state.load()

    expect(state.status.value).toBe('empty')
    expect(state.isReady.value).toBe(true)
  })

  it('keeps previous data when refresh fails with a blocking error', async () => {
    const state = createSalesDashboardState({
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(dashboard(4))
        .mockRejectedValueOnce(new Error('Backend unavailable'))
    })

    await state.load()
    await state.refresh({ currency: 'RUB' })

    expect(state.status.value).toBe('error')
    expect(state.dashboard.value?.kpi.openNow.count).toBe(4)
    expect(state.error.value?.message).toBe('Backend unavailable')
  })

  it('ignores stale request results when a newer request completes first', async () => {
    let resolveFirst: (value: DashboardResponse) => void = () => undefined
    let resolveSecond: (value: DashboardResponse) => void = () => undefined
    const state = createSalesDashboardState({
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi
        .fn()
        .mockImplementationOnce(async () => new Promise<DashboardResponse>(resolve => { resolveFirst = resolve }))
        .mockImplementationOnce(async () => new Promise<DashboardResponse>(resolve => { resolveSecond = resolve }))
    })

    const first = state.load({ currency: 'RUB' })
    const second = state.load({ currency: 'all' })
    await Promise.resolve()
    await Promise.resolve()
    resolveSecond(dashboard(2))
    await second
    resolveFirst(dashboard(1))
    await first

    expect(state.dashboard.value?.kpi.openNow.count).toBe(2)
  })

  it('maps warnings and blocking errors into state', async () => {
    const state = createSalesDashboardState({
      getBootstrap: vi.fn(async () => bootstrap),
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(dashboard(0, [{ code: 'PARTIAL_AGGREGATION' }]))
        .mockRejectedValueOnce(new Error('Backend unavailable'))
    })

    await state.load()
    expect(state.warnings.value).toEqual([{ code: 'PARTIAL_AGGREGATION' }])

    await state.refresh()
    expect(state.status.value).toBe('error')
    expect(state.error.value?.message).toBe('Backend unavailable')
  })
})
