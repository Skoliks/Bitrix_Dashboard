import { describe, expect, it, vi } from 'vitest'

import { createVibeCodeClient } from '../../src/vibecode/client.js'
import { AppError } from '../../src/http/errors.js'

const successResponse = (body: unknown): Response => Response.json(body, { status: 200 })

describe('VibeCode client', () => {
  it('adds server-side auth headers and never accepts arbitrary endpoint input', async () => {
    const fetchImpl = vi.fn(async () => successResponse({ success: true, data: [] }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com/v1/'),
      apiKey: 'vibe_app_secret',
      fetchImpl
    })

    await client.getDeals({ sessionToken: 'vibe_session_secret', limit: 2 })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://vibecode.example.com/v1/deals?limit=2')
    expect(new Headers(init.headers).get('x-api-key')).toBe('vibe_app_secret')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer vibe_session_secret')
    expect(Object.keys(client)).not.toContain('request')
  })

  it('resolves the portal and current user from the server-side Gateway bearer', async () => {
    const fetchImpl = vi.fn(async () => successResponse({
      success: true,
      data: {
        portal: 'portal.bitrix24.ru',
        currentUser: { bitrixUserId: '42' }
      }
    }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com/v1/'),
      apiKey: 'vibe_app_secret',
      fetchImpl
    })

    await expect(client.getCurrentUser({ sessionToken: 'vibe_session_gateway' })).resolves.toEqual({
      portal: 'portal.bitrix24.ru',
      userId: '42'
    })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://vibecode.example.com/v1/me')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer vibe_session_gateway')
  })

  it('reads the portal from /v1/me without a bearer session', async () => {
    const fetchImpl = vi.fn(async () => successResponse({
      success: true,
      data: { portal: 'portal.bitrix24.ru' }
    }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com/v1/'),
      apiKey: 'vibe_api_owner_secret',
      fetchImpl
    })

    await expect(client.getKeyPortal()).resolves.toEqual({ portal: 'portal.bitrix24.ru' })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://vibecode.example.com/v1/me')
    expect(new Headers(init.headers).get('x-api-key')).toBe('vibe_api_owner_secret')
    expect(new Headers(init.headers).get('authorization')).toBeNull()
  })

  it('accepts nullable Bitrix24 user fields and stage metadata from a personal API key', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(successResponse({
        success: true,
        data: [{
          id: 1,
          entityId: 'DEAL_STAGE_2',
          statusId: 'C2:NEW',
          name: 'New',
          nameInit: null,
          sort: 10,
          system: false,
          semantics: null,
          extra: { SEMANTICS: null, COLOR: null }
        }]
      }))
      .mockResolvedValueOnce(successResponse({
        success: true,
        data: [{ id: 1, active: true, name: null, lastName: null, email: 'owner@example.test', timeZone: 'Asia/Yakutsk' }]
      }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com/v1/'),
      apiKey: 'vibe_api_owner_secret',
      fetchImpl
    })

    await expect(client.getStatuses({ entityId: 'DEAL_STAGE_2' })).resolves.toEqual([{
      id: 'C2:NEW',
      entityId: 'DEAL_STAGE_2',
      name: 'New',
      sort: 10,
      semantic: null
    }])
    await expect(client.getUsers()).resolves.toEqual([{
      id: 1,
      active: true,
      timeZone: 'Asia/Yakutsk'
    }])
  })

  it('accepts only typed search and aggregate request bodies at compile time', () => {
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com'),
      apiKey: 'vibe_app_secret',
      fetchImpl: async () => successResponse({ success: true, data: [] })
    })

    const assertTypes = (): void => {
      void client.searchDeals({ body: { filter: { categoryId: 0 }, limit: 10 } })
      void client.aggregateDeals({ body: { op: 'count', groupBy: ['stageId'], filter: { categoryId: 0 } } })
      // @ts-expect-error unsupported arbitrary endpoint proxy payload
      void client.searchDeals({ body: { endpoint: '/v1/users', method: 'DELETE' } })
      // @ts-expect-error unsupported aggregate group field from Phase 0
      void client.aggregateDeals({ body: { op: 'count', groupBy: ['currency'] } })
    }

    expect(typeof assertTypes).toBe('function')
  })

  it('retries only retryable upstream statuses', async () => {
    const retryableFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ success: false, error: { code: 'RATE_LIMITED', message: 'slow down' } }, { status: 429 }))
      .mockResolvedValueOnce(successResponse({ success: true, data: [] }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com'),
      apiKey: 'vibe_app_secret',
      fetchImpl: retryableFetch,
      retryDelayMs: 0
    })

    await expect(client.getStatuses({ entityId: 'DEAL_STAGE' })).resolves.toEqual([])
    expect(retryableFetch).toHaveBeenCalledTimes(2)

    const nonRetryableFetch = vi.fn(async () => Response.json({
      success: false,
      error: { code: 'INVALID_PARAMS', message: 'bad request' }
    }, { status: 400 }))
    const nonRetryingClient = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com'),
      apiKey: 'vibe_app_secret',
      fetchImpl: nonRetryableFetch,
      retryDelayMs: 0
    })

    await expect(nonRetryingClient.getStatuses({ entityId: 'DEAL_STAGE' })).rejects.toBeInstanceOf(AppError)
    expect(nonRetryableFetch).toHaveBeenCalledTimes(1)
  })

  it('normalizes invalid success payloads without exposing raw upstream data', async () => {
    const fetchImpl = vi.fn(async () => successResponse({
      success: true,
      data: [{
        id: 1,
        title: '[REDACTED_DEAL_TITLE]',
        amount: 'not-a-number',
        currency: 'RUB',
        categoryId: 0,
        stageId: 'NEW',
        stageSemanticId: 'P',
        assignedById: 1,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        closedAt: null
      }]
    }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com'),
      apiKey: 'vibe_app_secret',
      fetchImpl
    })

    await expect(client.getDeals()).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' })
    await expect(client.getDeals()).rejects.toThrow('VibeCode returned an unexpected response shape.')
    await expect(client.getDeals()).rejects.not.toThrow('[REDACTED_DEAL_TITLE]')
  })

  it('retries timeout failures and returns a stable timeout error after attempts are exhausted', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    const eventuallySuccessfulFetch = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(successResponse({ success: true, data: [] }))
    const client = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com'),
      apiKey: 'vibe_app_secret',
      fetchImpl: eventuallySuccessfulFetch,
      retryDelayMs: 0
    })

    await expect(client.getCurrencies()).resolves.toEqual([])
    expect(eventuallySuccessfulFetch).toHaveBeenCalledTimes(2)

    const alwaysTimingOutFetch = vi.fn(async () => {
      throw abortError
    })
    const timingOutClient = createVibeCodeClient({
      apiBaseUrl: new URL('https://vibecode.example.com'),
      apiKey: 'vibe_app_secret',
      fetchImpl: alwaysTimingOutFetch,
      retryDelayMs: 0
    })

    await expect(timingOutClient.getCurrencies()).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' })
    await expect(timingOutClient.getCurrencies()).rejects.toThrow('VibeCode request timed out.')
    expect(alwaysTimingOutFetch).toHaveBeenCalledTimes(4)
  })
})
