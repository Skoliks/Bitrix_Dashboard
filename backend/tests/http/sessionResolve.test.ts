import { describe, expect, it, vi } from 'vitest'

import { resolveSessionContext } from '../../src/session/resolve.js'

describe('Gateway session resolution', () => {
  it('resolves the trusted portal through the server-side VibeCode client', async () => {
    const getCurrentUser = vi.fn(async () => ({ portal: 'portal.bitrix24.ru', userId: '42' }))
    const context = await resolveSessionContext(new Request('https://app.example/api/bootstrap', {
      headers: {
        'x-vibe-authorization': 'Bearer vibe_session_gateway',
        'x-vibe-user-id': '7'
      }
    }), { mode: 'gateway-headers' }, { getCurrentUser })

    expect(context).toEqual({
      sessionToken: 'vibe_session_gateway',
      publicContext: { portalDomain: 'portal.bitrix24.ru', userId: '42' }
    })
    expect(getCurrentUser).toHaveBeenCalledWith({ sessionToken: 'vibe_session_gateway' })
  })

  it('rejects a request without a Gateway bearer', async () => {
    await expect(resolveSessionContext(new Request('https://app.example/api/bootstrap'), {
      mode: 'gateway-headers'
    }, { getCurrentUser: vi.fn() })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      status: 401
    })
  })
})
