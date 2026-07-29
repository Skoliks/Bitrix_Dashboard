import type { VibeCodeClient } from '../vibecode/client.js'
import { AppError } from '../http/errors.js'
import { readSessionContext, type SessionContextConfig } from './context.js'

export interface ResolvedSessionContext {
  sessionToken?: string
  publicContext: {
    portalDomain: string
    userId?: string
  }
}

export const resolveSessionContext = async (
  request: Request,
  config: SessionContextConfig,
  client: Pick<VibeCodeClient, 'getCurrentUser' | 'getKeyPortal'>
): Promise<ResolvedSessionContext> => {
  const session = readSessionContext(request, config)
  if (config.mode === 'owner-api-key') {
    const portalDomain = config.ownerDemoPortal
    if (!portalDomain) {
      throw new AppError('VALIDATION_ERROR', 'Owner demo portal is not configured.', 400)
    }

    const identity = await client.getKeyPortal()
    if (identity.portal.toLowerCase() !== portalDomain) {
      throw new AppError('AUTH_REQUIRED', 'Owner demo API key does not match the configured portal.', 401)
    }

    return { publicContext: { portalDomain } }
  }

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
