import { describe, expect, it } from 'vitest'

import type { Currency, Deal, DealCategory, Stage, User } from '../../src/domain/models.js'
import { buildDashboardResponse } from '../../src/services/aggregationService.js'

const categories: DealCategory[] = [{ id: 0, name: 'Main', sort: 10, isLocked: false }]
const stages: Stage[] = [
  { id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process', color: '#00f' },
  { id: 'WON', entityId: 'DEAL_STAGE', name: 'Won', sort: 20, semantic: 'success' },
  { id: 'LOST', entityId: 'DEAL_STAGE', name: 'Lost', sort: 30, semantic: 'failure' }
]
const currencies: Currency[] = [
  { id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# RUB', decimals: 2 }
]
const users: User[] = [{ id: 7, active: true, displayName: 'Manager One', timeZone: 'UTC' }]

const deal = (overrides: Partial<Deal> = {}): Deal => ({
  id: 1,
  title: 'Deal',
  amount: 0,
  currency: 'RUB',
  categoryId: 0,
  stageId: 'NEW',
  stageSemanticId: 'P',
  assignedById: 7,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  closedAt: null,
  ...overrides
})

const baseInput = {
  filters: { categoryId: 0, preset: 'custom' as const, dateFrom: '2026-07-01', dateTo: '2026-07-31', currency: 'all' as const },
  references: { categories, stages, currencies, users, timeZone: 'UTC' },
  range: { dateFrom: '2026-07-01', dateTo: '2026-07-31', startAt: '2026-07-01T00:00:00.000Z', endAt: '2026-07-31T23:59:59.999Z' },
  bootstrapWarnings: []
}

describe('aggregation service', () => {
  it('calculates KPI, funnel, money, and recent deals from one exact snapshot', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      deals: [
        deal({ id: 1, title: 'Last day', amount: 100, createdAt: '2026-07-31T23:59:59.999Z', closedAt: '2026-08-15T10:00:00.000Z' }),
        deal({ id: 2, title: 'Won', stageId: 'WON', stageSemanticId: 'S', amount: 300, createdAt: '2026-07-02T10:00:00.000Z', closedAt: '2026-07-31T23:59:59.999Z' }),
        deal({ id: 3, title: 'Older open', createdAt: '2026-06-30T23:59:59.999Z' }),
        deal({ id: 4, title: 'Lost', stageId: 'LOST', stageSemanticId: 'F', createdAt: '2026-07-03T10:00:00.000Z' })
      ],
      snapshotTruncated: false
    })

    expect(response.kpi).toMatchObject({
      openNow: { count: 2 },
      openCreated: { count: 1 },
      won: { count: 1 },
      wonAmountByCurrency: [{ currency: 'RUB', amount: 300 }],
      averageWonAmountByCurrency: [{ currency: 'RUB', amount: 300 }]
    })
    expect(response.stageFunnel.map(stage => [stage.stageId, stage.count])).toEqual([
      ['NEW', 1], ['WON', 1], ['LOST', 1]
    ])
    expect(response.recentDeals.map(row => row.id)).toEqual([1, 4, 2])
    expect(response.recentDeals[0]).toMatchObject({ assignedName: 'Manager One' })
    expect(response.trend.points).toContainEqual(expect.objectContaining({ period: '2026-07-31', createdCount: 1, wonCount: 1 }))
  })

  it('does not count a process deal with a planned close date as won', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      deals: [deal({ id: 1, closedAt: '2026-07-20T10:00:00.000Z' })],
      snapshotTruncated: false
    })

    expect(response.kpi.won.count).toBe(0)
    expect(response.kpi.wonAmountByCurrency).toEqual([])
  })

  it('fills zero-value daily periods in the trend', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      range: { ...baseInput.range, dateTo: '2026-07-07', endAt: '2026-07-07T23:59:59.999Z' },
      deals: [deal({ id: 1, createdAt: '2026-07-02T10:00:00.000Z' })],
      snapshotTruncated: false
    })

    expect(response.trend.bucket).toBe('day')
    expect(response.trend.points).toHaveLength(7)
    expect(response.trend.points).toContainEqual({ period: '2026-07-03', createdCount: 0, wonCount: 0, wonAmountsByCurrency: [] })
  })

  it('uses month buckets for long ranges and portal-local dates for short ranges', () => {
    const monthly = buildDashboardResponse({
      ...baseInput,
      range: { ...baseInput.range, dateFrom: '2026-01-01', startAt: '2026-01-01T00:00:00.000Z' },
      deals: [deal({ id: 1, createdAt: '2026-07-02T10:00:00.000Z' })],
      snapshotTruncated: false
    })
    const local = buildDashboardResponse({
      ...baseInput,
      references: { ...baseInput.references, timeZone: 'Asia/Yakutsk' },
      range: { ...baseInput.range, dateTo: '2026-07-07', endAt: '2026-07-07T14:59:59.999Z' },
      deals: [deal({ id: 1, createdAt: '2026-07-01T15:30:00.000Z' })],
      snapshotTruncated: false
    })

    expect(monthly.trend.bucket).toBe('month')
    expect(monthly.trend.points).toContainEqual(expect.objectContaining({ period: '2026-07', createdCount: 1 }))
    expect(local.trend.points).toContainEqual(expect.objectContaining({ period: '2026-07-02', createdCount: 1 }))
  })

  it('warns about unknown semantics, incomplete money, and a 500-record snapshot', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      deals: Array.from({ length: 500 }, (_, index) => deal({
        id: index + 1,
        stageId: index === 0 ? 'MYSTERY' : 'WON',
        stageSemanticId: index === 0 ? null : 'S',
        currency: index === 1 ? null : 'RUB',
        closedAt: '2026-07-02T10:00:00.000Z'
      })),
      snapshotTruncated: true
    })

    expect(response.warnings).toEqual(expect.arrayContaining([
      { code: 'UNKNOWN_STAGE_SEMANTICS' },
      { code: 'INCOMPLETE_FINANCIAL_DATA' },
      { code: 'PARTIAL_AGGREGATION' }
    ]))
    expect(response.meta).toEqual({
      partialAggregation: true,
      truncatedBlocks: ['snapshot'],
      totalRecords: 500,
      recordsProcessed: 500
    })
  })
})
