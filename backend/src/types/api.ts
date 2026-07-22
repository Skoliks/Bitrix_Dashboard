export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'SCOPE_DENIED'
  | 'CRM_ACCESS_DENIED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'DATA_TRUNCATED'
  | 'INVALID_FILTERS'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'

export interface ApiErrorBody {
  error: {
    code: ErrorCode
    message: string
    requestId?: string
  }
}

export interface HealthResponse {
  status: 'ok'
  service: string
}

export interface ReadyResponse {
  status: 'ready'
  service: string
  config: {
    allowedOrigins: string[]
    appPublicUrl: string
    nodeEnv: string
    logLevel: string
    port: number
  }
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
  warnings: Array<{
    code: 'USERS_UNAVAILABLE'
  }>
}

export interface DashboardResponse {
  filters: {
    categoryId: number
    preset: 'last7' | 'last30' | 'last90' | 'currentMonth' | 'previousMonth' | 'custom'
    dateFrom?: string
    dateTo?: string
    currency: 'all' | string
  }
  references: Pick<BootstrapResponse, 'categories' | 'stages' | 'currencies' | 'users' | 'timeZone'>
  kpi: {
    openNow: { count: number }
    openCreated: { count: number }
    won: { count: number }
    wonAmountByCurrency: Array<{ currency: string; amount: number }>
    averageWonAmountByCurrency: Array<{ currency: string; amount: number }>
  }
  stageFunnel: Array<{
    stageId: string
    name: string
    sort: number
    color?: string
    semantic: string | null
    count: number
    share: number
    amountsByCurrency: Array<{ currency: string; amount: number }>
  }>
  trend: {
    bucket: 'day' | 'week' | 'month'
    points: Array<{
      period: string
      createdCount: number
      wonCount: number
      wonAmountsByCurrency: Array<{ currency: string; amount: number }>
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
  warnings: Array<{
    code: 'USERS_UNAVAILABLE' | 'INCOMPLETE_FINANCIAL_DATA' | 'UNKNOWN_STAGE_SEMANTICS' | 'PARTIAL_AGGREGATION'
  }>
  meta: {
    partialAggregation: boolean
    truncatedBlocks: string[]
    totalRecords: number
    recordsProcessed: number
  }
}
