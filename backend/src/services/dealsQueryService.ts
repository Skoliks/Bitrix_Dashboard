import type { ResolvedDateRange } from './dateAdapter.js'

type CurrencyFilter = 'all' | string
type DateField = 'createdAt' | 'closedAt'

interface QueryInput {
  categoryId: number
  currency: CurrencyFilter
  range: ResolvedDateRange
}

interface DateFilter {
  $gte: string
  $lte: string
}

interface DealFilter {
  categoryId: number
  stageSemanticId?: 'P' | 'S'
  currency?: string
  createdAt?: DateFilter
  closedAt?: DateFilter
}

interface AggregateQuery {
  op: 'count'
  groupBy?: Array<'stageId'>
  filter: DealFilter
  limit?: number
}

interface SearchQuery {
  filter: DealFilter
  order?: { createdAt: 'desc' }
  limit?: number
  select?: string[]
}

export interface DashboardQueries {
  openNow: AggregateQuery
  openCreated: AggregateQuery
  won: AggregateQuery
  funnel: AggregateQuery
  moneyKpi: SearchQuery
  trendCreated: SearchQuery
  trendWon: SearchQuery
  recentDeals: SearchQuery
}

const recentDealSelect = [
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

const trendDealSelect = ['id', 'amount', 'currency', 'stageId', 'createdAt', 'closedAt', 'stageSemanticId']
const moneyKpiSelect = ['id', 'amount', 'currency', 'stageId', 'closedAt', 'stageSemanticId']

export const buildDashboardQueries = (input: QueryInput): DashboardQueries => ({
  openNow: {
    op: 'count',
    filter: baseFilter(input, { stageSemanticId: 'P' })
  },
  openCreated: {
    op: 'count',
    filter: baseFilter(input, {
      stageSemanticId: 'P',
      dateField: 'createdAt'
    })
  },
  won: {
    op: 'count',
    filter: baseFilter(input, {
      stageSemanticId: 'S',
      dateField: 'closedAt'
    })
  },
  funnel: {
    op: 'count',
    groupBy: ['stageId'],
    filter: baseFilter(input, { dateField: 'createdAt' })
  },
  moneyKpi: {
    filter: baseFilter(input, {
      stageSemanticId: 'S',
      dateField: 'closedAt'
    }),
    limit: 500,
    select: moneyKpiSelect
  },
  trendCreated: {
    filter: baseFilter(input, { dateField: 'createdAt' }),
    limit: 500,
    select: trendDealSelect
  },
  trendWon: {
    filter: baseFilter(input, { dateField: 'closedAt' }),
    limit: 500,
    select: trendDealSelect
  },
  recentDeals: {
    filter: baseFilter(input, { dateField: 'createdAt' }),
    order: { createdAt: 'desc' },
    limit: 15,
    select: recentDealSelect
  }
})

const baseFilter = (
  input: QueryInput,
  options: { stageSemanticId?: 'P' | 'S'; dateField?: DateField } = {}
): DealFilter => ({
  categoryId: input.categoryId,
  ...(options.stageSemanticId ? { stageSemanticId: options.stageSemanticId } : {}),
  ...(input.currency !== 'all' ? { currency: input.currency } : {}),
  ...(options.dateField ? {
    [options.dateField]: {
      $gte: input.range.startAt,
      $lte: input.range.endAt
    }
  } : {})
})
