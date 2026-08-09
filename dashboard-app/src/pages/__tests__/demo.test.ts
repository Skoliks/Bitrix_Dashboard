import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('public demo route', () => {
  it('reuses the dashboard with static data instead of CRM API requests', () => {
    expect(read('src/pages/demo.vue')).toContain("import DashboardPage from './index.vue'")

    const dashboardPage = read('src/pages/index.vue')
    expect(dashboardPage).toContain("createDashboardApi({ mockMode: true, productionMode: false })")
    expect(dashboardPage).toContain("route.path === '/demo'")
  })
})
