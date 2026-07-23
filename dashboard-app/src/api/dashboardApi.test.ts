import { describe, expect, it, vi } from 'vitest'

import { createDashboardApi } from './dashboardApi'

describe('dashboard api', () => {
  it('loads bootstrap and dashboard through backend endpoints only', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ categories: [], stages: [], currencies: [], users: [], timeZone: 'UTC', defaults: { categoryId: 0, currency: 'all', period: { from: '2026-07-01', to: '2026-07-31' } }, warnings: [] }))
      .mockResolvedValueOnce(Response.json({ filters: { categoryId: 0, preset: 'last30', currency: 'all' }, references: { categories: [], stages: [], currencies: [], users: [], timeZone: 'UTC' }, kpi: { openNow: { count: 0 }, openCreated: { count: 0 }, won: { count: 0 }, wonAmountByCurrency: [], averageWonAmountByCurrency: [] }, stageFunnel: [], trend: { bucket: 'day', points: [] }, recentDeals: [], warnings: [], meta: { partialAggregation: false, truncatedBlocks: [], totalRecords: 0, recordsProcessed: 0 } }))
    const api = createDashboardApi({ fetchImpl })

    await api.getBootstrap()
    await api.getDashboard({ categoryId: 0, preset: 'custom', dateFrom: '2026-07-01', dateTo: '2026-07-31', currency: 'RUB' })

    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/bootstrap', expect.objectContaining({
      method: 'GET',
      credentials: 'include'
    }))
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/dashboard?categoryId=0&preset=custom&dateFrom=2026-07-01&dateTo=2026-07-31&currency=RUB', expect.objectContaining({
      method: 'GET',
      credentials: 'include'
    }))
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('crm.item.list')
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('vibe_')
  })

  it('returns stable api errors without leaking response details', async () => {
    const fetchImpl = vi.fn(async () => Response.json({
      error: { code: 'INVALID_FILTERS', message: 'Dashboard filters are invalid.' }
    }, { status: 400 }))
    const api = createDashboardApi({ fetchImpl })

    await expect(api.getDashboard({ categoryId: 999 })).rejects.toMatchObject({
      code: 'INVALID_FILTERS',
      status: 400,
      message: 'Dashboard filters are invalid.'
    })
  })

  it('normalizes non-json backend errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>Bad gateway</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' }
    }))
    const api = createDashboardApi({ fetchImpl })

    await expect(api.getDashboard()).rejects.toMatchObject({
      code: 'HTTP_502',
      status: 502,
      message: 'Dashboard request failed.'
    })
  })

  it('serves mock dashboard without calling network', async () => {
    const fetchImpl = vi.fn()
    const api = createDashboardApi({ fetchImpl, mockMode: true })

    const bootstrap = await api.getBootstrap()
    const dashboard = await api.getDashboard({ currency: 'RUB' })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(bootstrap.categories.length).toBeGreaterThan(0)
    expect(dashboard.filters.currency).toBe('RUB')
  })

  it('rejects mock dashboard mode in production', () => {
    expect(() => createDashboardApi({ fetchImpl: vi.fn(), mockMode: true, productionMode: true })).toThrow(
      'Dashboard mock mode is disabled in production.'
    )
  })
})
