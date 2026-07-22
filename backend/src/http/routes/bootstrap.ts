import type { BootstrapResponse } from '../../types/api.js'
import type { ReferenceDataService } from '../../services/referenceDataService.js'
import { readSessionContext, type SessionContextConfig } from '../../session/context.js'
import { AppError } from '../errors.js'

export const handleBootstrap = async (
  request: Request,
  referenceDataService: ReferenceDataService,
  headers: Headers,
  sessionContextConfig: SessionContextConfig
): Promise<Response> => {
  const session = readSessionContext(request, sessionContextConfig)
  if (!session.sessionToken) {
    throw new AppError('AUTH_REQUIRED', 'Bootstrap requires a user session.', 401)
  }

  if (!session.publicContext.portalDomain) {
    throw new AppError('VALIDATION_ERROR', 'Bootstrap requires a portal id.', 400)
  }

  const bootstrap = await referenceDataService.getBootstrap({
    portalId: session.publicContext.portalDomain,
    sessionToken: session.sessionToken,
    ...(session.publicContext.userId ? { userId: session.publicContext.userId } : {})
  })

  return Response.json(bootstrap satisfies BootstrapResponse, {
    status: 200,
    headers
  })
}
