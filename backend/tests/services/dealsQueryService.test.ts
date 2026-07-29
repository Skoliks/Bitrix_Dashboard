import { describe, expect, it } from 'vitest'

import { buildDashboardQueries } from '../../src/services/dealsQueryService.js'

const range = {
  dateFrom: '2026-07-01',
  dateTo: '2026-07-22',
  startAt: '2026-06-30T15:00:00.000Z',
  endAt: '2026-07-22T14:59:59.999Z'
}

describe('deals query service', () => {
  it('builds KPI, funnel and trend queries with supported Phase 0 filters only', () => {
    const queries = buildDashboardQueries({
      categoryId: 0,
      currency: 'RUB',
      range
    })

    expect(queries.openNow).toEqual({
      op: 'count',
      filter: {
        categoryId: 0,
        stageSemanticId: 'P',
        currency: 'RUB'
      }
    })
    expect(queries.openCreated.filter).toMatchObject({
      categoryId: 0,
      stageSemanticId: 'P',
      createdAt: { $gte: range.startAt, $lte: range.endAt }
    })
    expect(queries.won.filter).toMatchObject({
      categoryId: 0,
      stageSemanticId: 'S',
      closedAt: { $gte: range.startAt, $lte: range.endAt }
    })
    expect(queries.funnel).toMatchObject({
      op: 'count',
      groupBy: ['stageId'],
      filter: {
        categoryId: 0,
        createdAt: { $gte: range.startAt, $lte: range.endAt },
        currency: 'RUB'
      }
    })
    expect(queries.moneyKpi).toMatchObject({
      filter: {
        categoryId: 0,
        stageSemanticId: 'S',
        closedAt: { $gte: range.startAt, $lte: range.endAt },
        currency: 'RUB'
      },
      limit: 500,
      select: [
        'id',
        'title',
        'amount',
        'currency',
        'categoryId',
        'stageId',
        'stageSemanticId',
        'assignedById',
        'createdAt',
        'updatedAt',
        'closedAt'
      ]
    })
    expect(queries.trendCreated.filter).toHaveProperty('createdAt')
    expect(queries.trendWon.filter).toHaveProperty('closedAt')
    expect(queries.trendCreated).toMatchObject({
      limit: 500,
      select: [
        'id',
        'title',
        'amount',
        'currency',
        'categoryId',
        'stageId',
        'stageSemanticId',
        'assignedById',
        'createdAt',
        'updatedAt',
        'closedAt'
      ]
    })
    expect(queries.trendWon).toMatchObject({
      limit: 500,
      select: [
        'id',
        'title',
        'amount',
        'currency',
        'categoryId',
        'stageId',
        'stageSemanticId',
        'assignedById',
        'createdAt',
        'updatedAt',
        'closedAt'
      ]
    })
    expect(JSON.stringify(queries)).not.toContain('"from"')
    expect(JSON.stringify(queries)).not.toContain('"to"')
  })

  it('keeps recent deals as a separate search query with createdAt desc and limit 15', () => {
    const queries = buildDashboardQueries({
      categoryId: 2,
      currency: 'all',
      range
    })

    expect(queries.recentDeals).toEqual({
      filter: {
        categoryId: 2,
        createdAt: { $gte: range.startAt, $lte: range.endAt }
      },
      order: { createdAt: 'desc' },
      limit: 15,
      select: [
        'id',
        'title',
        'amount',
        'currency',
        'categoryId',
        'stageId',
        'stageSemanticId',
        'assignedById',
        'createdAt',
        'updatedAt',
        'closedAt'
      ]
    })
    expect(queries.recentDeals).not.toHaveProperty('op')
    expect(queries.recentDeals.filter).not.toHaveProperty('currency')
  })
})
