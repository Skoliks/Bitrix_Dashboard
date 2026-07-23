import { randomUUID } from 'node:crypto'

import { getConfigValidationError, loadConfig, type ConfigResult, type PublicConfig } from '../config.js'
import { createLogger } from '../logging/logger.js'
import { createReferenceDataService, type ReferenceDataService } from '../services/referenceDataService.js'
import type { StaticAssetHandler } from '../static.js'
import type { HealthResponse, ReadyResponse } from '../types/api.js'
import { createVibeCodeClient, type VibeCodeClient } from '../vibecode/client.js'
import { AppError, jsonErrorResponse } from './errors.js'
import { handleBootstrap } from './routes/bootstrap.js'
import { handleDashboard } from './routes/dashboard.js'
import { applyCorsHeaders, applySecurityHeaders } from './securityHeaders.js'

export interface App {
  fetch(request: Request): Promise<Response>
}

interface AppOptions {
  referenceDataService?: ReferenceDataService
  staticAssets?: StaticAssetHandler
  vibeCodeClient?: VibeCodeClient
}

export const createApp = (env: Record<string, string | undefined> = process.env, options: AppOptions = {}): App => {
  const config = loadConfig(env)
  const publicConfig = normalizePublicConfig(config)
  const logger = createLogger(publicConfig.logLevel)
  const vibeCodeClient = options.vibeCodeClient ?? createDefaultVibeCodeClient(config)
  const referenceDataService = options.referenceDataService ?? createDefaultReferenceDataService(config, vibeCodeClient)
  const staticAssets = options.staticAssets

  return {
    async fetch(request: Request): Promise<Response> {
      const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' })
      const requestId = request.headers.get('x-request-id')?.trim() || randomUUID()
      headers.set('x-request-id', requestId)
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
            service: 'dashboard-bitrix-backend',
            version: publicConfig.deploymentVersion
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

        if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
          if (!config.isValid) {
            throw getConfigValidationError(config)
          }

          return await handleBootstrap(request, referenceDataService, headers, config.sessionContext)
        }

        if (request.method === 'GET' && url.pathname === '/api/dashboard') {
          if (!config.isValid) {
            throw getConfigValidationError(config)
          }

          return await handleDashboard(request, referenceDataService, vibeCodeClient, headers, config.sessionContext)
        }

        const staticResponse = await staticAssets?.(request, headers)
        if (staticResponse) {
          return staticResponse
        }

        throw new AppError('VALIDATION_ERROR', 'Route not found.', 404)
      } catch (error) {
        logger.warn('Request failed', { error, requestId })
        return jsonErrorResponse(error, headers, requestId)
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
  deploymentVersion: config.publicConfig.deploymentVersion ?? 'local',
  nodeEnv: config.publicConfig.nodeEnv ?? 'development',
  sessionContextMode: config.publicConfig.sessionContextMode ?? 'provisional-headers',
  logLevel: config.publicConfig.logLevel ?? 'info',
  port: config.publicConfig.port ?? 3000
})

const createDefaultVibeCodeClient = (config: ConfigResult): VibeCodeClient => {
  if (!config.isValid) {
    return {
      async getDeals() { throw getConfigValidationError(config) },
      async searchDeals() { throw getConfigValidationError(config) },
      async aggregateDeals() { throw getConfigValidationError(config) },
      async getDealCategories() { throw getConfigValidationError(config) },
      async getStatuses() { throw getConfigValidationError(config) },
      async getUsers() { throw getConfigValidationError(config) },
      async getCurrencies() { throw getConfigValidationError(config) }
    }
  }

  return createVibeCodeClient({
    apiBaseUrl: config.vibeCodeApiBaseUrl,
    appKey: config.vibeCodeAppKey
  })
}

const createDefaultReferenceDataService = (config: ConfigResult, client: VibeCodeClient): ReferenceDataService => {
  if (!config.isValid) {
    return {
      async getBootstrap() {
        throw getConfigValidationError(config)
      }
    }
  }

  return createReferenceDataService({
    client
  })
}
