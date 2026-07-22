import { describe, expect, it } from 'vitest'

import { normalizeVibeCodeError } from '../../src/vibecode/errors.js'

describe('VibeCode error mapping', () => {
  it.each([
    [401, 'MISSING_API_KEY', 'AUTH_REQUIRED'],
    [403, 'SCOPE_DENIED', 'SCOPE_DENIED'],
    [429, 'RATE_LIMITED', 'RATE_LIMITED'],
    [502, 'BAD_GATEWAY', 'UPSTREAM_UNAVAILABLE'],
    [504, 'TIMEOUT', 'UPSTREAM_TIMEOUT'],
    [400, 'INVALID_FILTER_OPERATOR', 'VALIDATION_ERROR']
  ])('maps upstream %s %s to %s', (status, upstreamCode, expectedCode) => {
    const error = normalizeVibeCodeError(status, {
      success: false,
      error: {
        code: upstreamCode,
        message: 'Raw upstream title [REDACTED_DEAL_TITLE] and token vibe_session_secret'
      }
    })

    expect(error.code).toBe(expectedCode)
    expect(error.status).toBe(status)
    expect(error.message).not.toContain('[REDACTED_DEAL_TITLE]')
    expect(error.message).not.toContain('vibe_session_secret')
  })
})
