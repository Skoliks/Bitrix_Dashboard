import type { VibeCodeClient } from '../vibecode/client.js'
import { AppError } from '../http/errors.js'
import { readSessionContext, type SessionContextConfig } from './context.js'

export interface ResolvedSessionContext {
  sessionToken: string
  publicContext: {
    portalDomain: string
    userId?: string
  }
}

export const resolveSessionContext = async (
  request: Request,
  config: SessionContextConfig,
  client: Pick<VibeCodeClient, 'getCurrentUser'>
): Promise<ResolvedSessionContext> => {
  const session = readSessionContext(request, config)
  if (!session.sessionToken) {
    throw new AppError('AUTH_REQUIRED', 'Dashboard requires a user session.', 401)
  }

  const portalDomain = session.publicContext.portalDomain
  if (portalDomain) {
    return {
      sessionToken: session.sessionToken,
      publicContext: {
        portalDomain,
        ...(session.publicContext.userId ? { userId: session.publicContext.userId } : {})
      }
    }
  }

  if (config.mode !== 'gateway-headers') {
    throw new AppError('VALIDATION_ERROR', 'Dashboard requires a portal id.', 400)
  }

  const identity = await client.getCurrentUser({ sessionToken: session.sessionToken })
  return {
    sessionToken: session.sessionToken,
    publicContext: {
      portalDomain: identity.portal,
      userId: identity.userId
    }
  }
}
