import type { ApiErrorBody, ErrorCode } from '../types/api.js'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

const defaultMessages: Record<ErrorCode, string> = {
  AUTH_REQUIRED: 'Authentication is required.',
  SESSION_EXPIRED: 'Session expired.',
  SCOPE_DENIED: 'Required scope is missing.',
  CRM_ACCESS_DENIED: 'CRM access denied.',
  RATE_LIMITED: 'Rate limit exceeded.',
  UPSTREAM_TIMEOUT: 'Upstream request timed out.',
  UPSTREAM_UNAVAILABLE: 'Upstream service is unavailable.',
  DATA_TRUNCATED: 'Data was truncated by upstream limits.',
  INVALID_FILTERS: 'Dashboard filters are invalid.',
  VALIDATION_ERROR: 'Request or configuration validation failed.',
  UNKNOWN: 'Unexpected backend error.'
}

export interface ErrorResponse {
  status: number
  body: ApiErrorBody
}

export const toErrorResponse = (error: unknown): ErrorResponse => {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: defaultMessages[error.code]
        }
      }
    }
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'UNKNOWN',
        message: defaultMessages.UNKNOWN
      }
    }
  }
}

export const jsonErrorResponse = (error: unknown, headers: Headers): Response => {
  const mapped = toErrorResponse(error)
  return Response.json(mapped.body, {
    status: mapped.status,
    headers
  })
}
