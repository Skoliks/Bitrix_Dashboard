import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import { getConfigValidationError, loadConfig } from '../../src/config.js'

const validEnv = {
  VIBECODE_APP_KEY: 'vibe_app_test_secret',
  VIBECODE_API_BASE_URL: 'https://vibecode.example.com',
  BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com, https://portal.bitrix24.ru',
  APP_PUBLIC_URL: 'https://dashboard.example.com',
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  DEPLOYMENT_VERSION: 'phase10-test',
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
      deploymentVersion: 'phase10-test',
      port: 4010
    })
    expect(JSON.stringify(config.publicConfig)).not.toContain('vibe_app_')
  })

  it('adds local frontend origins outside production', () => {
    const config = loadConfig({
      ...validEnv,
      BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com',
      LOCAL_FRONTEND_ALLOWED_ORIGINS: 'http://127.0.0.1:5173, http://localhost:5173'
    })

    expect(config.isValid).toBe(true)
    expect(config.publicConfig.allowedOrigins).toEqual([
      'https://portal.bitrix24.com',
      'http://127.0.0.1:5173',
      'http://localhost:5173'
    ])
  })

  it('ignores local frontend origins in production', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      SESSION_CONTEXT_MODE: 'signed-headers',
      SESSION_CONTEXT_HMAC_SECRET: 'test_hmac_secret',
      VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech',
      BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com',
      LOCAL_FRONTEND_ALLOWED_ORIGINS: 'http://127.0.0.1:5173'
    })

    expect(config.isValid).toBe(true)
    expect(config.publicConfig.allowedOrigins).toEqual(['https://portal.bitrix24.com'])
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
      SESSION_CONTEXT_HMAC_SECRET: '',
      VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech'
    })

    expect(config.isValid).toBe(false)
    expect(getConfigValidationError(config).code).toBe('VALIDATION_ERROR')
  })

  it('allows Gateway session mode without an application HMAC secret', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      SESSION_CONTEXT_MODE: 'gateway-headers',
      VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech'
    })

    expect(config.isValid).toBe(true)
    expect(config.publicConfig.sessionContextMode).toBe('gateway-headers')
  })

  it('accepts the production owner demo profile with a personal API key', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      VIBECODE_APP_KEY: undefined,
      VIBECODE_API_KEY: 'vibe_api_owner_secret',
      VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech',
      BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.ru',
      SESSION_CONTEXT_MODE: 'owner-api-key',
      OWNER_DEMO_PORTAL: 'portal.bitrix24.ru'
    })

    expect(config).toMatchObject({
      isValid: true,
      vibeCodeApiKey: 'vibe_api_owner_secret',
      sessionContext: { mode: 'owner-api-key', ownerDemoPortal: 'portal.bitrix24.ru' }
    })
    expect(config.publicConfig).not.toHaveProperty('ownerDemoPortal')
  })

  it.each([
    ['missing personal key', { VIBECODE_API_KEY: undefined }],
    ['missing owner portal', { OWNER_DEMO_PORTAL: undefined }],
    ['mismatched portal', { OWNER_DEMO_PORTAL: 'other.bitrix24.ru' }]
  ])('rejects owner demo profile with %s', (_name, patch) => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      VIBECODE_APP_KEY: undefined,
      VIBECODE_API_KEY: 'vibe_api_owner_secret',
      VIBECODE_API_BASE_URL: 'https://vibecode.bitrix24.tech',
      BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.ru',
      SESSION_CONTEXT_MODE: 'owner-api-key',
      OWNER_DEMO_PORTAL: 'portal.bitrix24.ru',
      ...patch
    })

    expect(config).toMatchObject({ isValid: false })
    expect(JSON.stringify(config)).not.toContain('vibe_api_owner_secret')
  })

  it('rejects arbitrary VibeCode API endpoints in production', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      SESSION_CONTEXT_MODE: 'signed-headers',
      SESSION_CONTEXT_HMAC_SECRET: 'test_hmac_secret',
      VIBECODE_API_BASE_URL: 'https://evil.example.com'
    })

    expect(config.isValid).toBe(false)
    expect(getConfigValidationError(config).message).toContain('VIBECODE_API_BASE_URL host is not allowed in production')
  })

  it('keeps the default env example production safe', () => {
    const envExample = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')

    expect(envExample).toContain('NODE_ENV=production')
    expect(envExample).toContain('SESSION_CONTEXT_MODE=signed-headers')
    expect(envExample).not.toContain('SESSION_CONTEXT_MODE=provisional-headers')
  })
})
