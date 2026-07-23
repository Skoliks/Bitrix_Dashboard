import type { LogLevel } from '../config.js'

type LogWriter = (line: string) => void

const secretPatterns = [
  /vibe_app_[A-Za-z0-9._-]+/g,
  /vibe_api_[A-Za-z0-9._-]+/g,
  /vibe_session_[A-Za-z0-9._-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\+?\d[\d\s().-]{7,}\d/g
]

const sensitiveKeys = new Set([
  'amount',
  'authorization',
  'cookie',
  'dealname',
  'dealtitle',
  'displayname',
  'email',
  'fullname',
  'set-cookie',
  'x-api-key',
  'apikey',
  'appkey',
  'name',
  'opportunity',
  'phone',
  'title',
  'sessiontoken',
  'refreshtoken',
  'clientsecret',
  'vibecode_app_key',
  'vibecode_api_key',
  'vibecode_session_token'
])

export const redactSecrets = <T>(value: T): T => {
  if (typeof value === 'string') {
    let text = String(value)
    for (const pattern of secretPatterns) {
      text = text.replace(pattern, '[REDACTED]')
    }
    return text as unknown as T
  }

  if (Array.isArray(value)) {
    return value.map(item => redactSecrets(item)) as T
  }

  if (value && typeof value === 'object') {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: redactSecrets(value.message)
      } as T
    }

    const redacted: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      redacted[key] = sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : redactSecrets(item)
    }
    return redacted as T
  }

  return value
}

export interface Logger {
  debug(message: string, meta?: unknown): void
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
}

const priority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100
}

export const createLogger = (level: LogLevel, writer: LogWriter = console.log): Logger => {
  const write = (entryLevel: Exclude<LogLevel, 'silent'>, message: string, meta?: unknown): void => {
    if (priority[entryLevel] < priority[level]) {
      return
    }

    writer(JSON.stringify(redactSecrets({
      level: entryLevel,
      message,
      meta,
      timestamp: new Date().toISOString()
    })))
  }

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta)
  }
}
