import { AppError } from '../http/errors.js'
import type { BootstrapResponse } from '../types/api.js'
import type { VibeCodeClient } from '../vibecode/client.js'
import type { DealCategory, User } from '../domain/models.js'
import { MemoryCache } from './cache.js'

interface ReferenceDataServiceConfig {
  client: VibeCodeClient
  cache?: MemoryCache
  now?: () => Date
}

export interface BootstrapContext {
  portalId: string
  sessionToken?: string
}

export interface ReferenceDataService {
  getBootstrap(context: BootstrapContext): Promise<BootstrapResponse>
}

const ttl = {
  categories: 10 * 60 * 1000,
  stages: 10 * 60 * 1000,
  currencies: 60 * 60 * 1000,
  users: 5 * 60 * 1000
}

export const createReferenceDataService = (config: ReferenceDataServiceConfig): ReferenceDataService => {
  const cache = config.cache ?? new MemoryCache()
  const now = config.now ?? (() => new Date())

  const cached = async <T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> => {
    const hit = cache.get<T>(key)
    if (hit !== undefined) {
      return hit
    }

    const value = await load()
    cache.set(key, value, ttlMs)
    return value
  }

  return {
    async getBootstrap(context): Promise<BootstrapResponse> {
      const requestContext = context.sessionToken ? { sessionToken: context.sessionToken } : {}
      const categories = await cached(
        `categories:${context.portalId}`,
        ttl.categories,
        async () => sortCategories(await config.client.getDealCategories(requestContext))
      )

      if (categories.length === 0) {
        throw new AppError('CRM_ACCESS_DENIED', 'No accessible deal categories.', 403)
      }

      const selectedCategoryId = selectDefaultCategory(categories)
      const stageEntityId = selectedCategoryId === 0 ? 'DEAL_STAGE' : `DEAL_STAGE_${selectedCategoryId}`

      const [stages, currencies, usersResult] = await Promise.all([
        cached(
          `stages:${context.portalId}:${selectedCategoryId}`,
          ttl.stages,
          async () => config.client.getStatuses({ ...requestContext, entityId: stageEntityId })
        ),
        cached(
          `currencies:${context.portalId}`,
          ttl.currencies,
          async () => config.client.getCurrencies(requestContext)
        ),
        loadUsers(config.client, cache, context, requestContext)
      ])

      const timeZone = validTimeZone(usersResult.users.find(user => user.timeZone)?.timeZone)

      return {
        categories,
        stages,
        currencies,
        users: usersResult.users,
        timeZone,
        defaults: {
          categoryId: selectedCategoryId,
          currency: 'all',
          period: defaultPeriod(now(), timeZone)
        },
        warnings: usersResult.warning ? [{ code: usersResult.warning }] : []
      }
    }
  }
}

const loadUsers = async (
  client: VibeCodeClient,
  cache: MemoryCache,
  context: BootstrapContext,
  requestContext: { sessionToken?: string }
): Promise<{ users: User[]; warning?: 'USERS_UNAVAILABLE' }> => {
  const key = `users:${context.portalId}`
  const hit = cache.get<User[]>(key)
  if (hit !== undefined) {
    return { users: hit }
  }

  try {
    const users = await client.getUsers(requestContext)
    cache.set(key, users, ttl.users)
    return { users }
  } catch (error) {
    if (isBlockingUsersError(error)) {
      throw error
    }

    return { users: [], warning: 'USERS_UNAVAILABLE' }
  }
}

const sortCategories = (categories: DealCategory[]): DealCategory[] =>
  [...categories].sort((left, right) => left.sort - right.sort || left.id - right.id)

const selectDefaultCategory = (categories: DealCategory[]): number =>
  categories.some(category => category.id === 0) ? 0 : categories[0]?.id ?? 0

const defaultPeriod = (date: Date, timeZone: string): BootstrapResponse['defaults']['period'] => {
  const local = localDateParts(date, timeZone)
  const toDate = new Date(Date.UTC(local.year, local.month - 1, local.day))
  const fromDate = new Date(toDate)
  fromDate.setUTCDate(toDate.getUTCDate() - 29)

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate)
  }
}

const validTimeZone = (timeZone: string | undefined): string => {
  if (!timeZone) {
    return 'UTC'
  }

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return 'UTC'
  }
}

const isBlockingUsersError = (error: unknown): boolean =>
  error instanceof AppError && ['AUTH_REQUIRED', 'SESSION_EXPIRED', 'RATE_LIMITED'].includes(error.code)

const localDateParts = (date: Date, timeZone: string): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const value = (type: string): number => Number(parts.find(part => part.type === type)?.value)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day')
  }
}

const formatDate = (date: Date): string => date.toISOString().slice(0, 10)
