import type { ApiErrorBody, BootstrapResponse, DashboardFilterInput, DashboardResponse } from '../types/dashboard'
import { mockBootstrap, mockDashboard } from '../mocks/dashboard'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface DashboardApi {
  getBootstrap(): Promise<BootstrapResponse>
  getDashboard(filters?: DashboardFilterInput): Promise<DashboardResponse>
}

export interface DashboardApiOptions {
  baseUrl?: string
  fetchImpl?: FetchLike
  mockMode?: boolean
}

export class DashboardApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message)
    this.name = 'DashboardApiError'
    this.status = status
    this.code = body.error.code
    this.requestId = body.error.requestId
  }
}

export const createDashboardApi = (options: DashboardApiOptions = {}): DashboardApi => {
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = options.baseUrl ?? import.meta.env.VITE_BFF_BASE_URL ?? ''
  const mockMode = options.mockMode ?? import.meta.env.VITE_DASHBOARD_MOCK_MODE === 'true'

  if (mockMode) {
    return {
      async getBootstrap() {
        return structuredClone(mockBootstrap)
      },
      async getDashboard(filters = {}) {
        return {
          ...structuredClone(mockDashboard),
          filters: {
            ...mockDashboard.filters,
            ...filters
          }
        }
      }
    }
  }

  return {
    async getBootstrap() {
      return readJson<BootstrapResponse>(await fetchImpl(buildUrl(baseUrl, '/api/bootstrap'), requestInit()))
    },
    async getDashboard(filters = {}) {
      return readJson<DashboardResponse>(await fetchImpl(buildUrl(baseUrl, `/api/dashboard${queryString(filters)}`), requestInit()))
    }
  }
}

const requestInit = (): RequestInit => ({
  method: 'GET',
  credentials: 'include',
  headers: { accept: 'application/json' }
})

const readJson = async <T>(response: Response): Promise<T> => {
  const body = await parseJson(response)
  if (!response.ok) {
    throw new DashboardApiError(response.status, normalizeErrorBody(response, body))
  }
  return body as T
}

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const normalizeErrorBody = (response: Response, body: unknown): ApiErrorBody => {
  if (isApiErrorBody(body)) {
    return body
  }

  return {
    error: {
      code: `HTTP_${response.status}`,
      message: 'Dashboard request failed.'
    }
  }
}

const isApiErrorBody = (body: unknown): body is ApiErrorBody => {
  if (!body || typeof body !== 'object' || !('error' in body)) {
    return false
  }

  const error = (body as { error: unknown }).error
  return Boolean(
    error &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

const buildUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl) {
    return path
  }
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

const queryString = (filters: DashboardFilterInput): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
