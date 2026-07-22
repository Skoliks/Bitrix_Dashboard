import { getConfigValidationError, loadConfig, type ConfigResult, type PublicConfig } from '../config.js'
import { createLogger } from '../logging/logger.js'
import type { HealthResponse, ReadyResponse } from '../types/api.js'
import { AppError, jsonErrorResponse } from './errors.js'
import { applyCorsHeaders, applySecurityHeaders } from './securityHeaders.js'

export interface App {
  fetch(request: Request): Promise<Response>
}

export const createApp = (env: Record<string, string | undefined> = process.env): App => {
  const config = loadConfig(env)
  const publicConfig = normalizePublicConfig(config)
  const logger = createLogger(publicConfig.logLevel)

  return {
    async fetch(request: Request): Promise<Response> {
      const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' })
      applySecurityHeaders(headers, {
        allowedOrigins: publicConfig.allowedOrigins,
        appPublicUrl: publicConfig.appPublicUrl
      })
      applyCorsHeaders(headers, request.headers.get('origin'), publicConfig.allowedOrigins)

      try {
        const url = new URL(request.url)

        if (request.method === 'GET' && url.pathname === '/health') {
          return Response.json({
            status: 'ok',
            service: 'dashboard-bitrix-backend'
          } satisfies HealthResponse, { status: 200, headers })
        }

        if (request.method === 'OPTIONS') {
          ensureCorsAllowed(request, publicConfig.allowedOrigins)
          return new Response(null, { status: 204, headers })
        }

        ensureCorsAllowed(request, publicConfig.allowedOrigins)

        if (request.method === 'GET' && url.pathname === '/ready') {
          if (!config.isValid) {
            throw getConfigValidationError(config)
          }

          return Response.json({
            status: 'ready',
            service: 'dashboard-bitrix-backend',
            config: config.publicConfig
          } satisfies ReadyResponse, { status: 200, headers })
        }

        throw new AppError('VALIDATION_ERROR', 'Route not found.', 404)
      } catch (error) {
        logger.warn('Request failed', { error })
        return jsonErrorResponse(error, headers)
      }
    }
  }
}

const ensureCorsAllowed = (request: Request, allowedOrigins: string[]): void => {
  const origin = request.headers.get('origin')
  if (origin && !allowedOrigins.includes(origin)) {
    throw new AppError('CRM_ACCESS_DENIED', 'Origin is not allowed.', 403)
  }
}

const normalizePublicConfig = (config: ConfigResult): PublicConfig => ({
  allowedOrigins: config.publicConfig.allowedOrigins ?? [],
  appPublicUrl: config.publicConfig.appPublicUrl ?? 'http://localhost',
  nodeEnv: config.publicConfig.nodeEnv ?? 'development',
  logLevel: config.publicConfig.logLevel ?? 'info',
  port: config.publicConfig.port ?? 3000
})
