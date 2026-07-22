import { describe, expect, it } from 'vitest'

import { readSessionContext } from '../../src/session/context.js'

describe('session context', () => {
  it('reads session token from headers and exposes only sanitized context', () => {
    const context = readSessionContext(new Request('http://localhost/api', {
      headers: {
        authorization: 'Bearer vibe_session_secret',
        'x-bitrix24-domain': 'portal.bitrix24.com',
        'x-bitrix24-user-id': '42'
      }
    }))

    expect(context.sessionToken).toBe('vibe_session_secret')
    expect(context.publicContext).toEqual({
      portalDomain: 'portal.bitrix24.com',
      userId: '42'
    })
    expect(JSON.stringify(context.publicContext)).not.toContain('vibe_session_secret')
  })
})
