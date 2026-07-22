import { describe, expect, it } from 'vitest'

import { getConfigValidationError, loadConfig } from '../../src/config.js'

const validEnv = {
  VIBECODE_APP_KEY: 'vibe_app_test_secret',
  VIBECODE_API_BASE_URL: 'https://vibecode.example.com',
  BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com, https://portal.bitrix24.ru',
  APP_PUBLIC_URL: 'https://dashboard.example.com',
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  PORT: '4010'
}

describe('loadConfig', () => {
  it('validates required env and returns sanitized public fields', () => {
    const config = loadConfig(validEnv)

    expect(config.isValid).toBe(true)
    expect(config.publicConfig).toEqual({
      allowedOrigins: ['https://portal.bitrix24.com', 'https://portal.bitrix24.ru'],
      appPublicUrl: 'https://dashboard.example.com',
      nodeEnv: 'test',
      sessionContextMode: 'provisional-headers',
      logLevel: 'debug',
      port: 4010
    })
    expect(JSON.stringify(config.publicConfig)).not.toContain('vibe_app_')
  })

  it('reports missing required env without exposing provided secrets', () => {
    const config = loadConfig({
      ...validEnv,
      VIBECODE_API_BASE_URL: '',
      VIBECODE_APP_KEY: 'vibe_app_should_not_leak'
    })

    expect(config.isValid).toBe(false)
    expect(getConfigValidationError(config).code).toBe('VALIDATION_ERROR')
    expect(JSON.stringify(config)).not.toContain('vibe_app_should_not_leak')
  })

  it('requires HMAC secret for signed session mode', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      SESSION_CONTEXT_MODE: 'signed-headers',
      SESSION_CONTEXT_HMAC_SECRET: ''
    })

    expect(config.isValid).toBe(false)
    expect(getConfigValidationError(config).code).toBe('VALIDATION_ERROR')
  })
})
