import { describe, expect, it } from 'vitest'

import { createApiProxyConfig, DEFAULT_LOCAL_BACKEND_TARGET } from './devProxy'

describe('dev proxy config', () => {
  it('proxies api requests to the local backend by default', () => {
    expect(createApiProxyConfig()).toEqual({
      '/api': {
        target: DEFAULT_LOCAL_BACKEND_TARGET,
        changeOrigin: true,
        secure: false
      }
    })
  })

  it('uses a configured backend target when provided', () => {
    expect(createApiProxyConfig('http://localhost:4010')['/api']).toMatchObject({
      target: 'http://localhost:4010'
    })
  })
})
