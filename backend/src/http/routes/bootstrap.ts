import type { BootstrapResponse } from '../../types/api.js'
import type { ReferenceDataService } from '../../services/referenceDataService.js'
import type { VibeCodeClient } from '../../vibecode/client.js'
import { type SessionContextConfig } from '../../session/context.js'
import { resolveSessionContext } from '../../session/resolve.js'

export const handleBootstrap = async (
  request: Request,
  referenceDataService: ReferenceDataService,
  client: Pick<VibeCodeClient, 'getCurrentUser' | 'getKeyPortal'>,
  headers: Headers,
  sessionContextConfig: SessionContextConfig
): Promise<Response> => {
  const session = await resolveSessionContext(request, sessionContextConfig, client)

  const bootstrap = await referenceDataService.getBootstrap({
    portalId: session.publicContext.portalDomain,
    ...(session.sessionToken ? { sessionToken: session.sessionToken } : {}),
    ...(session.publicContext.userId ? { userId: session.publicContext.userId } : {})
  })

  return Response.json(bootstrap satisfies BootstrapResponse, {
    status: 200,
    headers
  })
}
