import { describe, expect, it } from 'vitest'

import { AppError, toErrorResponse } from '../../src/http/errors.js'

describe('error mapping', () => {
  it('maps internal errors to sanitized JSON responses', () => {
    const error = new AppError('SESSION_EXPIRED', 'Raw token vibe_session_secret expired', 401)
    const response = toErrorResponse(error)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('SESSION_EXPIRED')
    expect(JSON.stringify(response)).not.toContain('vibe_session_secret')
  })
})
