import { describe, expect, it } from 'vitest'

import { createLogger, redactSecrets } from '../../src/logging/logger.js'

describe('logger redaction', () => {
  it('redacts tokens and sensitive headers from log payloads', () => {
    const payload = redactSecrets({
      message: 'Authorization Bearer vibe_session_secret',
      apiKey: 'vibe_api_secret',
      appKey: 'vibe_app_secret',
      cookie: 'sid=secret',
      Authorization: 'Bearer upper-token',
      Cookie: 'upper-cookie=secret',
      'X-Api-Key': 'vibe_api_header_secret',
      refreshToken: 'vibe_session_refresh_secret',
      clientSecret: 'vibe_app_client_secret',
      nested: { authorization: 'Bearer token' }
    })

    const text = JSON.stringify(payload)

    expect(text).not.toContain('vibe_session_secret')
    expect(text).not.toContain('vibe_api_secret')
    expect(text).not.toContain('vibe_app_secret')
    expect(text).not.toContain('upper-token')
    expect(text).not.toContain('upper-cookie')
    expect(text).not.toContain('vibe_api_header_secret')
    expect(text).not.toContain('vibe_session_refresh_secret')
    expect(text).not.toContain('vibe_app_client_secret')
    expect(text).not.toContain('Bearer token')
    expect(text).toContain('[REDACTED]')
  })

  it('does not write silent logs', () => {
    const lines: string[] = []
    const logger = createLogger('silent', line => lines.push(line))

    logger.info('hidden', { token: 'vibe_session_secret' })

    expect(lines).toEqual([])
  })
})
