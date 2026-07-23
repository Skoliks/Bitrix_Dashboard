import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/http/app.js'
import { createStaticAssetHandler } from '../../src/static.js'

const createdDirs: string[] = []

describe('static frontend serving', () => {
  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('serves index.html for root and SPA fallback routes', async () => {
    const dist = createDist({
      'index.html': '<!doctype html><div id="app">Dashboard</div>',
      'assets/app.js': 'console.log("app")'
    })
    const app = createApp(validEnv, {
      staticAssets: createStaticAssetHandler({ root: dist })
    })

    const root = await app.fetch(new Request('https://dashboard.example.com/'))
    const fallback = await app.fetch(new Request('https://dashboard.example.com/deals/42'))

    expect(root.status).toBe(200)
    expect(root.headers.get('content-type')).toContain('text/html')
    expect(await root.text()).toContain('Dashboard')
    expect(fallback.status).toBe(200)
    expect(await fallback.text()).toContain('Dashboard')
  })

  it('serves immutable asset files without falling back to index.html', async () => {
    const dist = createDist({
      'index.html': '<!doctype html><div id="app">Dashboard</div>',
      'assets/app.js': 'console.log("app")'
    })
    const app = createApp(validEnv, {
      staticAssets: createStaticAssetHandler({ root: dist })
    })

    const response = await app.fetch(new Request('https://dashboard.example.com/assets/app.js'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/javascript')
    expect(response.headers.get('cache-control')).toContain('immutable')
    expect(await response.text()).toBe('console.log("app")')
  })

  it('does not let SPA fallback intercept API or health routes', async () => {
    const dist = createDist({
      'index.html': '<!doctype html><div id="app">Dashboard</div>'
    })
    const app = createApp(validEnv, {
      staticAssets: createStaticAssetHandler({ root: dist })
    })

    const missingApi = await app.fetch(new Request('https://dashboard.example.com/api/missing'))
    const apiRoot = await app.fetch(new Request('https://dashboard.example.com/api'))
    const health = await app.fetch(new Request('https://dashboard.example.com/health'))
    const ready = await app.fetch(new Request('https://dashboard.example.com/ready'))

    expect(missingApi.status).toBe(404)
    expect(missingApi.headers.get('content-type')).toContain('application/json')
    expect(await missingApi.text()).not.toContain('Dashboard')
    expect(apiRoot.status).toBe(404)
    expect(apiRoot.headers.get('content-type')).toContain('application/json')
    expect(await apiRoot.text()).not.toContain('Dashboard')
    expect(health.status).toBe(200)
    expect(await health.json()).toMatchObject({ status: 'ok' })
    expect(ready.status).toBe(200)
    expect(ready.headers.get('content-type')).toContain('application/json')
    expect(await ready.text()).not.toContain('Dashboard')
  })
})

const createDist = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'dashboard-static-'))
  createdDirs.push(root)

  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content, 'utf8')
  }

  return root
}

const validEnv = {
  VIBECODE_APP_KEY: 'vibe_app_test_secret',
  VIBECODE_API_BASE_URL: 'https://vibecode.example.com',
  BITRIX24_ALLOWED_ORIGINS: 'https://portal.bitrix24.com',
  APP_PUBLIC_URL: 'https://dashboard.example.com',
  NODE_ENV: 'test',
  SESSION_CONTEXT_MODE: 'provisional-headers',
  LOG_LEVEL: 'silent',
  PORT: '0'
}
