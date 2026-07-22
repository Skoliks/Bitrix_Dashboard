import { AppError } from '../http/errors.js'
import type { ErrorCode } from '../types/api.js'

interface VibeErrorBody {
  success?: false
  error?: {
    code?: string
    message?: string
  }
}

export const normalizeVibeCodeError = (status: number, body?: VibeErrorBody): AppError => {
  const upstreamCode = body?.error?.code ?? ''
  const code = mapVibeCodeError(status, upstreamCode)
  return new AppError(code, messageForCode(code), statusToBackendStatus(status, code))
}

export const mapVibeCodeError = (status: number, upstreamCode: string): ErrorCode => {
  if (status === 429) {
    return 'RATE_LIMITED'
  }

  if (status === 504) {
    return 'UPSTREAM_TIMEOUT'
  }

  if (status === 502 || status === 503) {
    return 'UPSTREAM_UNAVAILABLE'
  }

  if (status === 401) {
    return upstreamCode.toUpperCase().includes('SESSION') ? 'SESSION_EXPIRED' : 'AUTH_REQUIRED'
  }

  if (status === 403) {
    return upstreamCode.toUpperCase().includes('SCOPE') ? 'SCOPE_DENIED' : 'CRM_ACCESS_DENIED'
  }

  if (status === 400) {
    return 'VALIDATION_ERROR'
  }

  return 'UNKNOWN'
}

const statusToBackendStatus = (status: number, code: ErrorCode): number => {
  if (code === 'UNKNOWN') {
    return 502
  }

  return status
}

const messageForCode = (code: ErrorCode): string => {
  const messages: Record<ErrorCode, string> = {
    AUTH_REQUIRED: 'VibeCode authentication is required.',
    SESSION_EXPIRED: 'VibeCode session expired.',
    SCOPE_DENIED: 'VibeCode scope is missing.',
    CRM_ACCESS_DENIED: 'VibeCode CRM access denied.',
    RATE_LIMITED: 'VibeCode rate limit exceeded.',
    UPSTREAM_TIMEOUT: 'VibeCode request timed out.',
    UPSTREAM_UNAVAILABLE: 'VibeCode service is unavailable.',
    DATA_TRUNCATED: 'VibeCode data was truncated.',
    INVALID_FILTERS: 'VibeCode filters are invalid.',
    VALIDATION_ERROR: 'VibeCode request validation failed.',
    UNKNOWN: 'VibeCode returned an unknown error.'
  }

  return messages[code]
}
