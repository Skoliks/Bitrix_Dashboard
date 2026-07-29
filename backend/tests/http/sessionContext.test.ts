import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'

import { readSessionContext } from '../../src/session/context.js'

describe('session context', () => {
  const now = new Date('2026-07-23T00:00:00.000Z')

  it('reads provisional session headers only in provisional mode', () => {
    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        authorization: 'Bearer vibe_session_secret',
        'x-bitrix24-domain': 'portal.bitrix24.com',
        'x-bitrix24-user-id': '42'
      }
    }), { mode: 'provisional-headers' })

    expect(context.sessionToken).toBe('vibe_session_secret')
    expect(context.publicContext).toEqual({
      portalDomain: 'portal.bitrix24.com',
      userId: '42'
    })
    expect(JSON.stringify(context.publicContext)).not.toContain('vibe_session_secret')
  })

  it('rejects forged client headers in signed mode', () => {
    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        authorization: 'Bearer forged_session',
        'x-bitrix24-domain': 'evil.bitrix24.com',
        'x-bitrix24-user-id': '99'
      }
    }), { mode: 'signed-headers', hmacSecret: 'server-secret' })

    expect(context).toEqual({ publicContext: {} })
  })

  it('reads the Gateway-injected session handoff', () => {
    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        'x-vibe-authorization': 'Bearer vibe_session_gateway',
        'x-vibe-user-id': '42'
      }
    }), { mode: 'gateway-headers' })

    expect(context).toEqual({
      sessionToken: 'vibe_session_gateway',
      publicContext: { userId: '42' }
    })
  })

  it('accepts signed gateway session handoff', () => {
    const sessionToken = 'vibe_session_secret'
    const portalDomain = 'portal.bitrix24.com'
    const userId = '42'
    const issuedAt = String(Math.floor(now.getTime() / 1000))
    const signature = createHmac('sha256', 'server-secret')
      .update(`${sessionToken}\n${portalDomain}\n${userId}\n${issuedAt}`)
      .digest('hex')

    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        'x-vibecode-session-token': sessionToken,
        'x-vibecode-portal-domain': portalDomain,
        'x-vibecode-user-id': userId,
        'x-vibecode-session-issued-at': issuedAt,
        'x-vibecode-session-signature': `sha256=${signature}`
      }
    }), { mode: 'signed-headers', hmacSecret: 'server-secret', now })

    expect(context).toEqual({
      sessionToken,
      publicContext: {
        portalDomain,
        userId
      }
    })
  })

  it.each([
    ['expired issuedAt', '2026-07-22T23:49:59.000Z'],
    ['future issuedAt outside skew', '2026-07-23T00:05:01.000Z']
  ])('rejects signed gateway handoff with %s', (_caseName, issuedAtDate) => {
    const sessionToken = 'vibe_session_secret'
    const portalDomain = 'portal.bitrix24.com'
    const userId = '42'
    const issuedAt = String(Math.floor(new Date(issuedAtDate).getTime() / 1000))
    const signature = createHmac('sha256', 'server-secret')
      .update(`${sessionToken}\n${portalDomain}\n${userId}\n${issuedAt}`)
      .digest('hex')

    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        'x-vibecode-session-token': sessionToken,
        'x-vibecode-portal-domain': portalDomain,
        'x-vibecode-user-id': userId,
        'x-vibecode-session-issued-at': issuedAt,
        'x-vibecode-session-signature': `sha256=${signature}`
      }
    }), { mode: 'signed-headers', hmacSecret: 'server-secret', now, signedHeaderMaxAgeSeconds: 600, signedHeaderClockSkewSeconds: 300 })

    expect(context).toEqual({ publicContext: {} })
  })

  it('rejects signed gateway handoff with malformed issuedAt', () => {
    const sessionToken = 'vibe_session_secret'
    const portalDomain = 'portal.bitrix24.com'
    const userId = '42'
    const issuedAt = 'not-a-timestamp'
    const signature = createHmac('sha256', 'server-secret')
      .update(`${sessionToken}\n${portalDomain}\n${userId}\n${issuedAt}`)
      .digest('hex')

    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        'x-vibecode-session-token': sessionToken,
        'x-vibecode-portal-domain': portalDomain,
        'x-vibecode-user-id': userId,
        'x-vibecode-session-issued-at': issuedAt,
        'x-vibecode-session-signature': `sha256=${signature}`
      }
    }), { mode: 'signed-headers', hmacSecret: 'server-secret', now })

    expect(context).toEqual({ publicContext: {} })
  })
})
