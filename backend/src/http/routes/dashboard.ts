import type { VibeCodeClient } from '../../vibecode/client.js'
import type { DashboardResponse } from '../../types/api.js'
import type { ReferenceDataService } from '../../services/referenceDataService.js'
import { buildDashboardResponse } from '../../services/aggregationService.js'
import { buildDashboardQueries } from '../../services/dealsQueryService.js'
import { resolveDateRange } from '../../services/dateAdapter.js'
import { validateDashboardFilters } from '../../services/filterValidation.js'
import { type SessionContextConfig } from '../../session/context.js'
import { resolveSessionContext } from '../../session/resolve.js'

export const handleDashboard = async (
  request: Request,
  referenceDataService: ReferenceDataService,
  client: VibeCodeClient,
  headers: Headers,
  sessionContextConfig: SessionContextConfig
): Promise<Response> => {
  const session = await resolveSessionContext(request, sessionContextConfig, client)

  const bootstrap = await referenceDataService.getBootstrap({
    portalId: session.publicContext.portalDomain,
    sessionToken: session.sessionToken,
    ...(session.publicContext.userId ? { userId: session.publicContext.userId } : {})
  })
  const url = new URL(request.url)
  const queryInput = {
    categoryId: bootstrap.defaults.categoryId,
    preset: 'last30',
    currency: bootstrap.defaults.currency,
    ...Object.fromEntries(url.searchParams)
  }
  const filters = validateDashboardFilters({
    input: queryInput,
    categories: bootstrap.categories,
    currencies: bootstrap.currencies
  })
  const range = resolveDateRange({
    preset: filters.preset,
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    timeZone: bootstrap.timeZone,
    now: new Date()
  })
  const queries = buildDashboardQueries({
    categoryId: filters.categoryId,
    currency: filters.currency,
    range
  })
  const requestContext = { sessionToken: session.sessionToken }

  const [openNow, openCreated, won, funnel, moneyKpiDeals, trendCreatedDeals, trendWonDeals, recentDeals] = await Promise.all([
    client.aggregateDeals({ ...requestContext, body: queries.openNow }),
    client.aggregateDeals({ ...requestContext, body: queries.openCreated }),
    client.aggregateDeals({ ...requestContext, body: queries.won }),
    client.aggregateDeals({ ...requestContext, body: queries.funnel }),
    client.searchDeals({ ...requestContext, body: queries.moneyKpi }),
    client.searchDeals({ ...requestContext, body: queries.trendCreated }),
    client.searchDeals({ ...requestContext, body: queries.trendWon }),
    client.searchDeals({ ...requestContext, body: queries.recentDeals })
  ])

  const dashboard = buildDashboardResponse({
    filters,
    references: {
      categories: bootstrap.categories,
      stages: bootstrap.stages,
      currencies: bootstrap.currencies,
      users: bootstrap.users,
      timeZone: bootstrap.timeZone
    },
    range,
    bootstrapWarnings: bootstrap.warnings,
    aggregates: {
      openNow,
      openCreated,
      won,
      funnel,
      moneyKpi: won
    },
    moneyKpiDeals,
    trendCreatedDeals,
    trendWonDeals,
    recentDeals
  })

  return Response.json(dashboard satisfies DashboardResponse, {
    status: 200,
    headers
  })
}
