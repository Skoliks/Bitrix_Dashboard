export type DatePreset = 'last7' | 'last30' | 'last90' | 'currentMonth' | 'previousMonth' | 'custom'
export type DashboardStatus = 'initial' | 'loading' | 'ready' | 'refreshing' | 'empty' | 'error'

export interface DashboardFilters {
  categoryId: number
  preset: DatePreset
  dateFrom?: string
  dateTo?: string
  currency: 'all' | string
}

export interface DashboardFilterInput {
  categoryId?: number
  preset?: DatePreset
  dateFrom?: string
  dateTo?: string
  currency?: 'all' | string
}

export interface BootstrapResponse {
  categories: Array<{
    id: number
    name: string
    sort: number
    isLocked: boolean
  }>
  stages: Array<{
    id: string
    entityId: string
    name: string
    sort: number
    color?: string
    semantic: string | null
    categoryId?: number
  }>
  currencies: Array<{
    id: string
    amountCnt: number
    amount: number
    sort: number
    base: boolean
    fullName: string
    formatString: string
    decimals: number
  }>
  users: Array<{
    id: number
    active: boolean
    displayName?: string
    timeZone?: string
  }>
  timeZone: string
  defaults: {
    categoryId: number
    currency: 'all'
    period: {
      from: string
      to: string
    }
  }
  warnings: BootstrapWarning[]
}

export interface MoneyAmount {
  currency: string
  amount: number
}

export interface DashboardResponse {
  filters: DashboardFilters
  references: Pick<BootstrapResponse, 'categories' | 'stages' | 'currencies' | 'users' | 'timeZone'>
  kpi: {
    openNow: {
      count: number
      amountsByCurrency: MoneyAmount[]
    }
    openCreated: { count: number }
    won: { count: number }
    wonAmountByCurrency: MoneyAmount[]
    averageWonAmountByCurrency: MoneyAmount[]
  }
  stageFunnel: Array<{
    stageId: string
    name: string
    sort: number
    color?: string
    semantic: string | null
    count: number
    share: number
    amountsByCurrency: MoneyAmount[]
  }>
  trend: {
    bucket: 'day' | 'week' | 'month'
    points: Array<{
      period: string
      createdCount: number
      wonCount: number
      wonAmountsByCurrency: MoneyAmount[]
    }>
  }
  recentDeals: Array<{
    id: number
    title: string
    amount: number
    currency: string | null
    categoryId: number
    stageId: string
    stageSemanticId: string | null
    assignedById: number | null
    assignedName: string | null
    createdAt: string
    updatedAt: string
    closedAt: string | null
  }>
  warnings: DashboardWarning[]
  meta: {
    partialAggregation: boolean
    truncatedBlocks: string[]
    totalRecords: number
    recordsProcessed: number
  }
}

export interface DashboardWarning {
  code: 'USERS_UNAVAILABLE' | 'INCOMPLETE_FINANCIAL_DATA' | 'UNKNOWN_STAGE_SEMANTICS' | 'PARTIAL_AGGREGATION'
}

export interface BootstrapWarning {
  code: 'USERS_UNAVAILABLE'
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    requestId?: string
  }
}
