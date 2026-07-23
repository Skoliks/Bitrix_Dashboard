import { describe, expect, it } from 'vitest'

import type { Deal, Currency, DealCategory, Stage, User } from '../../src/domain/models.js'
import { buildDashboardResponse } from '../../src/services/aggregationService.js'

const categories: DealCategory[] = [{ id: 0, name: 'Main', sort: 10, isLocked: false }]
const stages: Stage[] = [
  { id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process', color: '#00f' },
  { id: 'WON', entityId: 'DEAL_STAGE', name: 'Won', sort: 20, semantic: 'success' },
  { id: 'LOST', entityId: 'DEAL_STAGE', name: 'Lost', sort: 30, semantic: 'failure' }
]
const currencies: Currency[] = [
  { id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# RUB', decimals: 2 },
  { id: 'USD', amountCnt: 1, amount: 1, sort: 200, base: false, fullName: 'Dollar', formatString: '$#', decimals: 2 }
]
const users: User[] = [{ id: 7, active: true, displayName: 'Manager One', timeZone: 'UTC' }]

const deal = (overrides: Partial<Deal>): Deal => ({
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
  filters: {
    categoryId: 0,
    preset: 'custom' as const,
    dateFrom: '2026-07-01',
    dateTo: '2026-07-31',
    currency: 'all' as const
  },
  references: {
    categories,
    stages,
    currencies,
    users,
    timeZone: 'UTC'
  },
  range: {
    dateFrom: '2026-07-01',
    dateTo: '2026-07-31',
    startAt: '2026-07-01T00:00:00.000Z',
    endAt: '2026-07-31T23:59:59.999Z'
  },
  bootstrapWarnings: []
}

describe('aggregation service', () => {
  it('calculates KPI, multi-currency money and recent assigned names', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      aggregates: {
        openNow: aggregateCount(5),
        openCreated: aggregateCount(3),
        won: aggregateCount(2),
        funnel: aggregateCount(3, [
          { stageId: 'NEW', count: 2, aggregates: {} },
          { stageId: 'WON', count: 1, aggregates: {} }
        ]),
        moneyKpi: aggregateCount(2)
      },
      moneyKpiDeals: [
        deal({ id: 7, stageId: 'WON', stageSemanticId: 'S', amount: 300, currency: 'RUB', closedAt: '2026-07-04T10:00:00.000Z' }),
        deal({ id: 8, stageId: 'WON', stageSemanticId: 'S', amount: 50, currency: 'USD', closedAt: '2026-07-05T10:00:00.000Z' })
      ],
      trendCreatedDeals: [
        deal({ id: 1, stageId: 'NEW', amount: 100, currency: 'RUB', createdAt: '2026-07-01T10:00:00.000Z' }),
        deal({ id: 2, stageId: 'NEW', amount: 50, currency: 'USD', createdAt: '2026-07-02T10:00:00.000Z' }),
        deal({ id: 3, stageId: 'WON', amount: 200, currency: 'RUB', createdAt: '2026-07-03T10:00:00.000Z' })
      ],
      trendWonDeals: [
        deal({ id: 4, stageId: 'WON', stageSemanticId: 'S', amount: 300, currency: 'RUB', closedAt: '2026-07-04T10:00:00.000Z' }),
        deal({ id: 5, stageId: 'WON', stageSemanticId: 'S', amount: 50, currency: 'USD', closedAt: '2026-07-05T10:00:00.000Z' })
      ],
      recentDeals: [
        deal({ id: 6, title: 'Recent', amount: 10, currency: 'RUB', assignedById: 7 })
      ]
    })

    expect(response.kpi).toMatchObject({
      openNow: { count: 5 },
      openCreated: { count: 3 },
      won: { count: 2 },
      wonAmountByCurrency: [
        { currency: 'RUB', amount: 300 },
        { currency: 'USD', amount: 50 }
      ],
      averageWonAmountByCurrency: [
        { currency: 'RUB', amount: 300 },
        { currency: 'USD', amount: 50 }
      ]
    })
    expect(response.stageFunnel.map(stage => [stage.stageId, stage.count, stage.share])).toEqual([
      ['NEW', 2, 2 / 3],
      ['WON', 1, 1 / 3],
      ['LOST', 0, 0]
    ])
    expect(response.stageFunnel[0]?.amountsByCurrency).toEqual([
      { currency: 'RUB', amount: 100 },
      { currency: 'USD', amount: 50 }
    ])
    expect(response.recentDeals[0]).toMatchObject({ id: 6, assignedName: 'Manager One' })
    expect(response.warnings).toEqual([])
  })

  it('returns zero average without won deals and warns about incomplete financial data', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      aggregates: {
        openNow: aggregateCount(0),
        openCreated: aggregateCount(0),
        won: aggregateCount(0),
        funnel: aggregateCount(0)
      },
      trendCreatedDeals: [deal({ id: 1, currency: null, amount: 25 })],
      trendWonDeals: [deal({ id: 2, stageSemanticId: 'S', currency: null, amount: 75, closedAt: '2026-07-02T10:00:00.000Z' })],
      recentDeals: []
    })

    expect(response.kpi.averageWonAmountByCurrency).toEqual([])
    expect(response.kpi.wonAmountByCurrency).toEqual([])
    expect(response.warnings).toContainEqual({ code: 'INCOMPLETE_FINANCIAL_DATA' })
  })

  it('uses stage fallback semantics and warns on unknown semantics and truncation', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      references: {
        ...baseInput.references,
        stages: [{ id: 'MYSTERY', entityId: 'DEAL_STAGE', name: 'Mystery', sort: 10, semantic: null }]
      },
      aggregates: {
        openNow: aggregateCount(1, undefined, true),
        openCreated: aggregateCount(1),
        won: aggregateCount(0),
        funnel: aggregateCount(1, [{ stageId: 'MYSTERY', count: 1, aggregates: {} }], true)
      },
      trendCreatedDeals: [deal({ id: 1, stageId: 'MYSTERY', stageSemanticId: null })],
      trendWonDeals: [],
      recentDeals: []
    })

    expect(response.stageFunnel[0]).toMatchObject({ stageId: 'MYSTERY', semantic: null, count: 1 })
    expect(response.warnings).toEqual(expect.arrayContaining([
      { code: 'UNKNOWN_STAGE_SEMANTICS' },
      { code: 'PARTIAL_AGGREGATION' }
    ]))
    expect(response.meta).toMatchObject({
      partialAggregation: true,
      truncatedBlocks: ['openNow', 'funnel']
    })
  })

  it('groups trend by day for short ranges and by month for long ranges', () => {
    const short = buildDashboardResponse({
      ...baseInput,
      range: { ...baseInput.range, dateFrom: '2026-07-01', dateTo: '2026-07-07' },
      aggregates: emptyAggregates(),
      trendCreatedDeals: [deal({ id: 1, createdAt: '2026-07-02T10:00:00.000Z' })],
      trendWonDeals: [deal({ id: 2, stageSemanticId: 'S', closedAt: '2026-07-02T12:00:00.000Z' })],
      recentDeals: []
    })
    const long = buildDashboardResponse({
      ...baseInput,
      range: { ...baseInput.range, dateFrom: '2026-01-01', dateTo: '2026-07-31' },
      aggregates: emptyAggregates(),
      trendCreatedDeals: [deal({ id: 3, createdAt: '2026-07-02T10:00:00.000Z' })],
      trendWonDeals: [],
      recentDeals: []
    })

    expect(short.trend.bucket).toBe('day')
    expect(short.trend.points).toContainEqual(expect.objectContaining({ period: '2026-07-02', createdCount: 1, wonCount: 1 }))
    expect(long.trend.bucket).toBe('month')
    expect(long.trend.points).toContainEqual(expect.objectContaining({ period: '2026-07', createdCount: 1 }))
  })

  it('groups trend by portal timezone calendar days', () => {
    const response = buildDashboardResponse({
      ...baseInput,
      references: {
        ...baseInput.references,
        timeZone: 'Asia/Yakutsk'
      },
      range: { ...baseInput.range, dateFrom: '2026-07-01', dateTo: '2026-07-07' },
      aggregates: emptyAggregates(),
      trendCreatedDeals: [deal({ id: 1, createdAt: '2026-07-01T15:30:00.000Z' })],
      trendWonDeals: [deal({ id: 2, stageSemanticId: 'S', closedAt: '2026-07-01T16:00:00.000Z' })],
      recentDeals: []
    })

    expect(response.trend.points).toContainEqual(expect.objectContaining({
      period: '2026-07-02',
      createdCount: 1,
      wonCount: 1
    }))
  })

  it('warns when bounded deal searches may make money or trend incomplete', () => {
    const fullBatch = Array.from({ length: 500 }, (_, index) => deal({ id: index + 1 }))

    const response = buildDashboardResponse({
      ...baseInput,
      aggregates: emptyAggregates(),
      moneyKpiDeals: fullBatch,
      trendCreatedDeals: fullBatch,
      trendWonDeals: [],
      recentDeals: []
    })

    expect(response.warnings).toContainEqual({ code: 'PARTIAL_AGGREGATION' })
    expect(response.meta.truncatedBlocks).toContain('trendCreated')
    expect(response.meta.truncatedBlocks).toContain('moneyKpi')
  })
})

const aggregateCount = (count: number, groups = [] as Array<{ stageId?: string; count: number; aggregates: Record<string, unknown> }>, truncated = false) => ({
  count,
  aggregates: {},
  groups,
  meta: {
    totalRecords: count,
    recordsProcessed: count,
    truncated
  }
})

const emptyAggregates = () => ({
  openNow: aggregateCount(0),
  openCreated: aggregateCount(0),
  won: aggregateCount(0),
  funnel: aggregateCount(0),
  moneyKpi: aggregateCount(0)
})
