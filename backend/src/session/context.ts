export interface SessionContext {
  sessionToken?: string
  publicContext: {
    portalDomain?: string
    userId?: string
  }
}

export const readSessionContext = (request: Request): SessionContext => {
  const authorization = request.headers.get('authorization')
  const sessionToken = authorization?.replace(/^Bearer\s+/i, '').trim() || undefined
  const portalDomain = request.headers.get('x-bitrix24-domain')?.trim() || undefined
  const userId = request.headers.get('x-bitrix24-user-id')?.trim() || undefined

  return {
    ...(sessionToken ? { sessionToken } : {}),
    publicContext: {
      ...(portalDomain ? { portalDomain } : {}),
      ...(userId ? { userId } : {})
    }
  }
}
