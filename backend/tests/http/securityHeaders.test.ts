import { describe, expect, it } from 'vitest'

import { applySecurityHeaders } from '../../src/http/securityHeaders.js'

describe('security headers', () => {
  it('applies iframe-safe baseline security headers', () => {
    const headers = new Headers()

    applySecurityHeaders(headers, {
      allowedOrigins: ['https://portal.bitrix24.com'],
      appPublicUrl: 'https://dashboard.example.com'
    })

    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('referrer-policy')).toBe('no-referrer')
    expect(headers.get('permissions-policy')).toContain('camera=()')
    expect(headers.get('content-security-policy')).toContain('frame-ancestors')
    expect(headers.has('x-frame-options')).toBe(false)
  })
})
