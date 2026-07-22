import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/http/app.js'

const validEnv = {
  VIBECODE_APP_KEY: 'vibe_app_test_secret',
  VIBECODE_API_BASE_URL: 'https://vibecode.example.com',
  BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com',
  APP_PUBLIC_URL: 'https://dashboard.example.com',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  PORT: '0'
}

const forbiddenPatterns = ['vibe_app_', 'vibe_api_', 'vibe_session_', 'Authorization', 'cookie']

describe('http app', () => {
  it('returns liveness without requiring VibeCode access or exposing secrets', async () => {
    const app = createApp(validEnv)
    const response = await app.fetch(new Request('http://localhost/health', {
      headers: { origin: 'https://monitoring.example.com' }
    }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(JSON.parse(body)).toMatchObject({ status: 'ok' })
    for (const pattern of forbiddenPatterns) {
      expect(body).not.toContain(pattern)
    }
  })

  it('returns readiness for valid configuration with security headers', async () => {
    const app = createApp(validEnv)
    const response = await app.fetch(new Request('http://localhost/ready', {
      headers: { origin: 'https://portal.bitrix24.com' }
    }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://portal.bitrix24.com')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(JSON.parse(body)).toMatchObject({ status: 'ready' })
    for (const pattern of forbiddenPatterns) {
      expect(body).not.toContain(pattern)
    }
  })

  it('returns a clear readiness error when required env is missing', async () => {
    const app = createApp({ ...validEnv, VIBECODE_APP_KEY: '' })
    const response = await app.fetch(new Request('http://localhost/ready'))
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(body)).toMatchObject({
      error: { code: 'VALIDATION_ERROR' }
    })
    expect(body).not.toContain('vibe_app_')
  })

  it('rejects arbitrary CORS origins', async () => {
    const app = createApp(validEnv)
    const response = await app.fetch(new Request('http://localhost/ready', {
      headers: { origin: 'https://evil.example.com' }
    }))

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(await response.json()).toMatchObject({
      error: { code: 'CRM_ACCESS_DENIED' }
    })
  })
})
