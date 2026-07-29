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
    ...(session.sessionToken ? { sessionToken: session.sessionToken } : {}),
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
  const dashboardBootstrap = filters.categoryId === bootstrap.defaults.categoryId
    ? bootstrap
    : await referenceDataService.getBootstrap({
        portalId: session.publicContext.portalDomain,
        ...(session.sessionToken ? { sessionToken: session.sessionToken } : {}),
        ...(session.publicContext.userId ? { userId: session.publicContext.userId } : {}),
        categoryId: filters.categoryId
      })
  const range = resolveDateRange({
    preset: filters.preset,
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    timeZone: dashboardBootstrap.timeZone,
    now: new Date()
  })
  const queries = buildDashboardQueries({
    categoryId: filters.categoryId,
    currency: filters.currency,
    range
  })
  const requestContext = session.sessionToken ? { sessionToken: session.sessionToken } : {}

  const deals = await client.searchDeals({ ...requestContext, body: queries.snapshot })

  const dashboard = buildDashboardResponse({
    filters,
    references: {
      categories: dashboardBootstrap.categories,
      stages: dashboardBootstrap.stages,
      currencies: dashboardBootstrap.currencies,
      users: dashboardBootstrap.users,
      timeZone: dashboardBootstrap.timeZone
    },
    range,
    bootstrapWarnings: dashboardBootstrap.warnings,
    deals,
    snapshotTruncated: deals.length === queries.snapshot.limit
  })

  return Response.json(dashboard satisfies DashboardResponse, {
    status: 200,
    headers
  })
}
