import { describe, expect, it } from 'vitest'

import { buildDashboardQueries } from '../../src/services/dealsQueryService.js'

const range = {
  dateFrom: '2026-07-01',
  dateTo: '2026-07-22',
  startAt: '2026-06-30T15:00:00.000Z',
  endAt: '2026-07-22T14:59:59.999Z'
}

const expectedSelect = [
  'id', 'title', 'amount', 'currency', 'categoryId', 'stageId', 'stageSemanticId', 'assignedById', 'createdAt', 'updatedAt', 'closedAt'
]

describe('deals query service', () => {
  it('builds one bounded snapshot without upstream date filters', () => {
    const queries = buildDashboardQueries({ categoryId: 2, currency: 'RUB', range })

    expect(queries).toEqual({
      snapshot: {
        filter: { categoryId: 2, currency: 'RUB' },
        limit: 500,
        select: expectedSelect
      }
    })
    expect(queries.snapshot.filter).not.toHaveProperty('createdAt')
    expect(queries.snapshot.filter).not.toHaveProperty('closedAt')
  })

  it('omits the currency constraint when all currencies are selected', () => {
    const queries = buildDashboardQueries({ categoryId: 4, currency: 'all', range })

    expect(queries.snapshot.filter).toEqual({ categoryId: 4 })
    expect(queries.snapshot.limit).toBe(500)
  })
})
