export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'SCOPE_DENIED'
  | 'CRM_ACCESS_DENIED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'DATA_TRUNCATED'
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
