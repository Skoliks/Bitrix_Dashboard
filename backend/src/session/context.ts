import { createHmac, timingSafeEqual } from 'node:crypto'

import type { SessionContextMode } from '../config.js'

export interface SessionContext {
  sessionToken?: string
  publicContext: {
    portalDomain?: string
    userId?: string
  }
}

export interface SessionContextConfig {
  mode: SessionContextMode
  hmacSecret?: string
}

export const readSessionContext = (request: Request, config: SessionContextConfig): SessionContext => {
  if (config.mode === 'signed-headers') {
    return readSignedHeaders(request, config.hmacSecret)
  }

  return readProvisionalHeaders(request)
}

const readProvisionalHeaders = (request: Request): SessionContext => {
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

const readSignedHeaders = (request: Request, hmacSecret: string | undefined): SessionContext => {
  if (!hmacSecret) {
    return emptyContext()
  }

  const sessionToken = request.headers.get('x-vibecode-session-token')?.trim()
  const portalDomain = request.headers.get('x-vibecode-portal-domain')?.trim()
  const userId = request.headers.get('x-vibecode-user-id')?.trim()
  const issuedAt = request.headers.get('x-vibecode-session-issued-at')?.trim()
  const signature = request.headers.get('x-vibecode-session-signature')?.trim()

  if (!sessionToken || !portalDomain || !userId || !issuedAt || !signature) {
    return emptyContext()
  }

  const expected = createHmac('sha256', hmacSecret)
    .update(`${sessionToken}\n${portalDomain}\n${userId}\n${issuedAt}`)
    .digest('hex')

  if (!matchesSignature(signature, expected)) {
    return emptyContext()
  }

  return {
    sessionToken,
    publicContext: {
      portalDomain,
      userId
    }
  }
}

const matchesSignature = (signature: string, expected: string): boolean => {
  const actual = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature
  if (!/^[a-f0-9]{64}$/i.test(actual)) {
    return false
  }

  const actualBuffer = Buffer.from(actual, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

const emptyContext = (): SessionContext => ({ publicContext: {} })
