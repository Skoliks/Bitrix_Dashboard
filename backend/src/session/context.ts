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
  now?: Date
  signedHeaderMaxAgeSeconds?: number
  signedHeaderClockSkewSeconds?: number
}

const defaultSignedHeaderMaxAgeSeconds = 600
const defaultSignedHeaderClockSkewSeconds = 300

export const readSessionContext = (request: Request, config: SessionContextConfig): SessionContext => {
  if (config.mode === 'signed-headers') {
    return readSignedHeaders(request, config)
  }

  if (config.mode === 'gateway-headers') {
    return readGatewayHeaders(request)
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

const readGatewayHeaders = (request: Request): SessionContext => {
  const authorization = request.headers.get('x-vibe-authorization')
  const sessionToken = authorization?.replace(/^Bearer\s+/i, '').trim() || undefined
  const userId = request.headers.get('x-vibe-user-id')?.trim() || undefined

  return {
    ...(sessionToken ? { sessionToken } : {}),
    publicContext: {
      ...(userId ? { userId } : {})
    }
  }
}

const readSignedHeaders = (request: Request, config: SessionContextConfig): SessionContext => {
  if (!config.hmacSecret) {
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

  if (!isFreshIssuedAt(issuedAt, config)) {
    return emptyContext()
  }

  const expected = createHmac('sha256', config.hmacSecret)
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

const isFreshIssuedAt = (issuedAt: string, config: SessionContextConfig): boolean => {
  if (!/^\d+$/.test(issuedAt)) {
    return false
  }

  const issuedAtMs = Number(issuedAt) * 1000
  if (!Number.isSafeInteger(issuedAtMs)) {
    return false
  }

  const nowMs = (config.now ?? new Date()).getTime()
  const maxAgeMs = (config.signedHeaderMaxAgeSeconds ?? defaultSignedHeaderMaxAgeSeconds) * 1000
  const skewMs = (config.signedHeaderClockSkewSeconds ?? defaultSignedHeaderClockSkewSeconds) * 1000
  return issuedAtMs >= nowMs - maxAgeMs && issuedAtMs <= nowMs + skewMs
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
