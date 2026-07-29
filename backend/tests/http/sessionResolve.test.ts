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
    }), { mode: 'gateway-headers' }, { getCurrentUser, getKeyPortal: vi.fn() })

    expect(context).toEqual({
      sessionToken: 'vibe_session_gateway',
      publicContext: { portalDomain: 'portal.bitrix24.ru', userId: '42' }
    })
    expect(getCurrentUser).toHaveBeenCalledWith({ sessionToken: 'vibe_session_gateway' })
  })

  it('rejects a request without a Gateway bearer', async () => {
    await expect(resolveSessionContext(new Request('https://app.example/api/bootstrap'), {
      mode: 'gateway-headers'
    }, { getCurrentUser: vi.fn(), getKeyPortal: vi.fn() })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      status: 401
    })
  })

  it('resolves the fixed owner portal without accepting a browser token', async () => {
    const getKeyPortal = vi.fn(async () => ({ portal: 'portal.bitrix24.ru' }))
    const context = await resolveSessionContext(new Request('https://app.example/api/bootstrap', {
      headers: { authorization: 'Bearer forged' }
    }), {
      mode: 'owner-api-key',
      ownerDemoPortal: 'portal.bitrix24.ru'
    }, { getCurrentUser: vi.fn(), getKeyPortal })

    expect(context).toEqual({ publicContext: { portalDomain: 'portal.bitrix24.ru' } })
    expect(getKeyPortal).toHaveBeenCalledOnce()
  })

  it('rejects an owner API key bound to a different portal', async () => {
    await expect(resolveSessionContext(new Request('https://app.example/api/bootstrap'), {
      mode: 'owner-api-key',
      ownerDemoPortal: 'portal.bitrix24.ru'
    }, {
      getCurrentUser: vi.fn(),
      getKeyPortal: vi.fn(async () => ({ portal: 'other.bitrix24.ru' }))
    })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      status: 401
    })
  })
})
