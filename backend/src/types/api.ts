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
