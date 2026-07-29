import type { ResolvedDateRange } from './dateAdapter.js'

type CurrencyFilter = 'all' | string

interface QueryInput {
  categoryId: number
  currency: CurrencyFilter
  range: ResolvedDateRange
}

interface DealFilter {
  categoryId: number
  currency?: string
}

interface SearchQuery {
  filter: DealFilter
  limit: number
  select: string[]
}

export interface DashboardQueries {
  snapshot: SearchQuery
}

const snapshotDealSelect = [
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

export const buildDashboardQueries = (input: QueryInput): DashboardQueries => ({
  snapshot: {
    filter: {
      categoryId: input.categoryId,
      ...(input.currency !== 'all' ? { currency: input.currency } : {})
    },
    limit: 500,
    select: snapshotDealSelect
  }
})
