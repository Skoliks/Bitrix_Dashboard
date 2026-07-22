import { createServer } from 'node:http'

import { loadConfig } from './config.js'
import { createApp } from './http/app.js'
import { createWebRequest } from './http/nodeRequest.js'
import { createLogger } from './logging/logger.js'

const config = loadConfig()
const logLevel = config.publicConfig.logLevel ?? 'info'
const port = config.publicConfig.port ?? 3000
const logger = createLogger(logLevel)
const app = createApp()

const server = createServer(async (request, response) => {
  const webRequest = createWebRequest(request, port)
  const webResponse = await app.fetch(webRequest)
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()))
  response.end(await webResponse.text())
})

server.listen(port, () => {
  logger.info('Backend started', { port, configValid: config.isValid })
})

const shutdown = (signal: NodeJS.Signals): void => {
  logger.info('Shutdown requested', { signal })
  server.close(error => {
    if (error) {
      logger.error('Shutdown failed', { error })
      process.exit(1)
    }
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', { error })
  process.exit(1)
})
process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection', { reason })
  process.exit(1)
})
