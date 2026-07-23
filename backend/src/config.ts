import { AppError } from './http/errors.js'

export type RuntimeMode = 'development' | 'test' | 'production'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'
export type SessionContextMode = 'provisional-headers' | 'signed-headers'

export interface PublicConfig {
  allowedOrigins: string[]
  appPublicUrl: string
  deploymentVersion: string
  nodeEnv: RuntimeMode
  sessionContextMode: SessionContextMode
  logLevel: LogLevel
  port: number
}

export interface AppConfig {
  vibeCodeAppKey: string
  vibeCodeApiBaseUrl: URL
  sessionContext: {
    mode: SessionContextMode
    hmacSecret?: string
  }
  publicConfig: PublicConfig
}

export type ConfigResult =
  | (AppConfig & { isValid: true; errors: [] })
  | { isValid: false; errors: string[]; publicConfig: Partial<PublicConfig> }

type Env = Record<string, string | undefined>

const runtimeModes = new Set<RuntimeMode>(['development', 'test', 'production'])
const logLevels = new Set<LogLevel>(['debug', 'info', 'warn', 'error', 'silent'])
const sessionContextModes = new Set<SessionContextMode>(['provisional-headers', 'signed-headers'])

export const loadConfig = (env: Env = process.env): ConfigResult => {
  const errors: string[] = []
  const appKey = readRequired(env, 'VIBECODE_APP_KEY', errors)
  const apiBaseUrl = readUrl(env, 'VIBECODE_API_BASE_URL', errors)
  const appPublicUrl = readUrl(env, 'APP_PUBLIC_URL', errors)
  const nodeEnv = readEnum(env.NODE_ENV, runtimeModes, 'development', 'NODE_ENV', errors)
  validateProductionVibeCodeEndpoint(apiBaseUrl, nodeEnv, errors)
  const allowedOrigins = readOrigins(env, nodeEnv, errors)
  const sessionContextMode = readSessionContextMode(env, nodeEnv, errors)
  const sessionContextHmacSecret = readSessionContextHmacSecret(env, sessionContextMode, errors)
  const logLevel = readEnum(env.LOG_LEVEL, logLevels, 'info', 'LOG_LEVEL', errors)
  const deploymentVersion = env.DEPLOYMENT_VERSION?.trim() || 'local'
  const port = readPort(env.PORT, errors)

  const publicConfig: Partial<PublicConfig> = {
    allowedOrigins,
    deploymentVersion,
    nodeEnv,
    sessionContextMode,
    logLevel,
    port
  }

  if (appPublicUrl) {
    publicConfig.appPublicUrl = appPublicUrl.origin
  }

  if (errors.length > 0 || !appKey || !apiBaseUrl || !appPublicUrl || allowedOrigins.length === 0) {
    return { isValid: false, errors, publicConfig }
  }

  return {
    isValid: true,
    errors: [],
    vibeCodeAppKey: appKey,
    vibeCodeApiBaseUrl: apiBaseUrl,
    sessionContext: {
      mode: sessionContextMode,
      ...(sessionContextHmacSecret ? { hmacSecret: sessionContextHmacSecret } : {})
    },
    publicConfig: {
      allowedOrigins,
      appPublicUrl: appPublicUrl.origin,
      deploymentVersion,
      nodeEnv,
      sessionContextMode,
      logLevel,
      port
    }
  }
}

export const getConfigValidationError = (config: ConfigResult): AppError => {
  if (config.isValid) {
    return new AppError('UNKNOWN', 'Configuration is valid', 500)
  }

  return new AppError(
    'VALIDATION_ERROR',
    `Invalid backend configuration: ${config.errors.join('; ')}`,
    503
  )
}

const readRequired = (env: Env, key: string, errors: string[]): string | undefined => {
  const value = env[key]?.trim()
  if (!value) {
    errors.push(`${key} is required`)
    return undefined
  }
  return value
}

const readUrl = (env: Env, key: string, errors: string[]): URL | undefined => {
  const value = readRequired(env, key, errors)
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      errors.push(`${key} must use https for non-localhost origins`)
    }
    return url
  } catch {
    errors.push(`${key} must be a valid URL`)
    return undefined
  }
}

const allowedProductionVibeCodeHosts = new Set(['vibecode.bitrix24.tech'])

const validateProductionVibeCodeEndpoint = (
  apiBaseUrl: URL | undefined,
  nodeEnv: RuntimeMode,
  errors: string[]
): void => {
  if (!apiBaseUrl || nodeEnv !== 'production') {
    return
  }

  if (!allowedProductionVibeCodeHosts.has(apiBaseUrl.hostname)) {
    errors.push('VIBECODE_API_BASE_URL host is not allowed in production')
  }
}

const readOrigins = (env: Env, nodeEnv: RuntimeMode, errors: string[]): string[] => {
  const origins: string[] = []
  appendOrigins(origins, env.BITRIX24_ALLOWED_ORIGINS, 'BITRIX24_ALLOWED_ORIGINS', errors)

  if (nodeEnv !== 'production') {
    appendOrigins(origins, env.LOCAL_FRONTEND_ALLOWED_ORIGINS, 'LOCAL_FRONTEND_ALLOWED_ORIGINS', errors)
  }

  if (!env.BITRIX24_ALLOWED_ORIGINS?.trim()) {
    errors.push('BITRIX24_ALLOWED_ORIGINS is required')
  }

  if (origins.length === 0) {
    errors.push('BITRIX24_ALLOWED_ORIGINS must contain at least one origin')
  }

  return [...new Set(origins)]
}

const appendOrigins = (
  origins: string[],
  raw: string | undefined,
  key: string,
  errors: string[]
): void => {
  if (!raw?.trim()) {
    return
  }

  for (const item of raw.split(',')) {
    const value = item.trim()
    if (!value) {
      continue
    }

    try {
      origins.push(new URL(value).origin)
    } catch {
      errors.push(`${key} contains invalid URL: ${value}`)
    }
  }
}

const readEnum = <T extends string>(
  value: string | undefined,
  allowed: Set<T>,
  fallback: T,
  key: string,
  errors: string[]
): T => {
  if (!value) {
    return fallback
  }

  if (allowed.has(value as T)) {
    return value as T
  }

  errors.push(`${key} must be one of ${[...allowed].join(', ')}`)
  return fallback
}

const readSessionContextMode = (
  env: Env,
  nodeEnv: RuntimeMode,
  errors: string[]
): SessionContextMode => {
  const fallback = nodeEnv === 'production' ? 'signed-headers' : 'provisional-headers'
  return readEnum(env.SESSION_CONTEXT_MODE, sessionContextModes, fallback, 'SESSION_CONTEXT_MODE', errors)
}

const readSessionContextHmacSecret = (
  env: Env,
  mode: SessionContextMode,
  errors: string[]
): string | undefined => {
  const value = env.SESSION_CONTEXT_HMAC_SECRET?.trim()
  if (mode === 'signed-headers' && !value) {
    errors.push('SESSION_CONTEXT_HMAC_SECRET is required when SESSION_CONTEXT_MODE=signed-headers')
    return undefined
  }

  return value || undefined
}

const readPort = (value: string | undefined, errors: string[]): number => {
  if (!value) {
    return 3000
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    errors.push('PORT must be an integer between 0 and 65535')
    return 3000
  }

  return port
}
