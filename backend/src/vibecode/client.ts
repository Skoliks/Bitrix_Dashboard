import type { Currency, Deal, DealCategory, Stage, User } from '../domain/models.js'
import { AppError } from '../http/errors.js'
import { mapCurrencies, mapDealCategories, mapDeals, mapStages, mapUsers } from './mappers.js'
import {
  type AggregateData,
  type DealAggregateRequestBody,
  type DealSearchRequestBody,
  currenciesResponseSchema,
  currentUserResponseSchema,
  dealAggregateRequestBodySchema,
  dealCategoriesResponseSchema,
  dealSearchRequestBodySchema,
  dealsAggregateResponseSchema,
  dealsListResponseSchema,
  dealsSearchResponseSchema,
  statusesResponseSchema,
  usersResponseSchema,
  vibeErrorResponseSchema
} from './schemas.js'
import { normalizeVibeCodeError } from './errors.js'

type FetchImpl = (input: URL, init: RequestInit) => Promise<Response>

interface VibeCodeClientConfig {
  apiBaseUrl: URL
  apiKey: string
  fetchImpl?: FetchImpl
  timeoutMs?: number
  maxAttempts?: number
  retryDelayMs?: number
}

interface RequestContext {
  sessionToken?: string
}

interface GetDealsParams extends RequestContext {
  limit?: number
}

interface StatusParams extends RequestContext {
  entityId: string
}

interface BodyParams extends RequestContext {
  body: DealSearchRequestBody
}

interface AggregateBodyParams extends RequestContext {
  body: DealAggregateRequestBody
}

export interface VibeCodeClient {
  getKeyPortal(): Promise<{ portal: string }>
  getCurrentUser(params: RequestContext): Promise<{ portal: string; userId: string }>
  getDeals(params?: GetDealsParams): Promise<Deal[]>
  searchDeals(params: BodyParams): Promise<Deal[]>
  aggregateDeals(params: AggregateBodyParams): Promise<AggregateData>
  getDealCategories(params?: RequestContext): Promise<DealCategory[]>
  getStatuses(params: StatusParams): Promise<Stage[]>
  getUsers(params?: RequestContext): Promise<User[]>
  getCurrencies(params?: RequestContext): Promise<Currency[]>
}

const retryableStatuses = new Set([429, 502, 503, 504])

export const createVibeCodeClient = (config: VibeCodeClientConfig): VibeCodeClient => {
  const fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init))
  const timeoutMs = config.timeoutMs ?? 12_000
  const maxAttempts = config.maxAttempts ?? 2
  const retryDelayMs = config.retryDelayMs ?? 100

  const request = async (path: string, init: RequestInit = {}, context: RequestContext = {}): Promise<unknown> => {
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(fetchImpl, buildUrl(config.apiBaseUrl, path), {
          ...init,
          headers: buildHeaders(config.apiKey, context.sessionToken, init.headers)
        }, timeoutMs)
        const body = await readJson(response)

        if (!response.ok) {
          const parsedError = vibeErrorResponseSchema.safeParse(body)
          const appError = normalizeVibeCodeError(response.status, parsedError.success ? parsedError.data : undefined)
          if (retryableStatuses.has(response.status) && attempt < maxAttempts) {
            await delay(retryDelayMs)
            continue
          }
          throw appError
        }

        return body
      } catch (error) {
        lastError = error
        if (isTimeoutError(error) && attempt < maxAttempts) {
          await delay(retryDelayMs)
          continue
        }
        throw mapClientError(error)
      }
    }

    throw mapClientError(lastError)
  }

  return {
    async getKeyPortal() {
      const body = await request('/me', { method: 'GET' })
      const response = parseUpstream(currentUserResponseSchema, body)
      return { portal: response.data.portal }
    },

    async getCurrentUser(params) {
      const body = await request('/me', { method: 'GET' }, params)
      const response = parseUpstream(currentUserResponseSchema, body)
      if (!response.data.currentUser) {
        throw new AppError('AUTH_REQUIRED', 'VibeCode did not return an authenticated user.', 401)
      }
      return {
        portal: response.data.portal,
        userId: response.data.currentUser.bitrixUserId
      }
    },

    async getDeals(params = {}) {
      const query = params.limit === undefined ? '' : `?limit=${encodeURIComponent(String(params.limit))}`
      const body = await request(`/deals${query}`, { method: 'GET' }, params)
      return mapDeals(parseUpstream(dealsListResponseSchema, body).data)
    },

    async searchDeals(params) {
      const requestBody = dealSearchRequestBodySchema.parse(params.body)
      const body = await request('/deals/search', jsonPost(requestBody), params)
      return mapDeals(parseUpstream(dealsSearchResponseSchema, body).data)
    },

    async aggregateDeals(params) {
      const requestBody = dealAggregateRequestBodySchema.parse(params.body)
      const body = await request('/deals/aggregate', jsonPost(requestBody), params)
      return parseUpstream(dealsAggregateResponseSchema, body).data
    },

    async getDealCategories(params = {}) {
      const body = await request('/deal-categories', { method: 'GET' }, params)
      return mapDealCategories(parseUpstream(dealCategoriesResponseSchema, body).data)
    },

    async getStatuses(params) {
      const body = await request(`/statuses?filter%5BentityId%5D=${encodeURIComponent(params.entityId)}`, { method: 'GET' }, params)
      return mapStages(parseUpstream(statusesResponseSchema, body).data)
    },

    async getUsers(params = {}) {
      const body = await request('/users', { method: 'GET' }, params)
      return mapUsers(parseUpstream(usersResponseSchema, body).data)
    },

    async getCurrencies(params = {}) {
      const body = await request('/currencies', { method: 'GET' }, params)
      return mapCurrencies(parseUpstream(currenciesResponseSchema, body).data)
    }
  }
}

const parseUpstream = <T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, body: unknown): T => {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('UPSTREAM_UNAVAILABLE', 'VibeCode returned an unexpected response shape.', 502)
  }

  return parsed.data
}

const jsonPost = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' }
})

const buildUrl = (baseUrl: URL, path: string): URL => {
  const base = baseUrl.toString().endsWith('/') ? baseUrl : new URL(`${baseUrl.toString()}/`)
  return new URL(path.replace(/^\//, ''), base)
}

const buildHeaders = (apiKey: string, sessionToken: string | undefined, headers?: HeadersInit): Headers => {
  const result = new Headers(headers)
  result.set('accept', 'application/json')
  result.set('x-api-key', apiKey)
  if (sessionToken) {
    result.set('authorization', `Bearer ${sessionToken}`)
  }
  return result
}

const fetchWithTimeout = async (
  fetchImpl: FetchImpl,
  url: URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json() as unknown
  } catch {
    throw new AppError('UPSTREAM_UNAVAILABLE', 'VibeCode returned non-JSON response.', 502)
  }
}

const isTimeoutError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

const mapClientError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error
  }

  if (isTimeoutError(error)) {
    return new AppError('UPSTREAM_TIMEOUT', 'VibeCode request timed out.', 504)
  }

  return new AppError('UPSTREAM_UNAVAILABLE', 'VibeCode request failed.', 502)
}

const delay = async (ms: number): Promise<void> => {
  if (ms <= 0) {
    return
  }

  await new Promise(resolve => setTimeout(resolve, ms))
}
