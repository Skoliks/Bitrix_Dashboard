import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('phase 9 frontend quality gates', () => {
  it('keeps session tokens out of browser storage source paths', () => {
    const source = read('src/composables/useB24.ts')

    expect(source).not.toContain('localStorage.')
    expect(source).not.toContain('sessionStorage.')
    expect(source).not.toContain('vibe_session_')
  })

  it('keeps production navigation limited to dashboard MVP surface', () => {
    const layout = read('src/layouts/default.vue')

    expect(layout).toContain('Дашборд')
    expect(layout).not.toContain('/customers')
    expect(layout).not.toContain('/inbox')
    expect(layout).not.toContain('/install')
    expect(layout).not.toContain('/settings')
    expect(existsSync(join(root, 'src/pages/install.vue'))).toBe(false)
  })

  it('exposes package quality gate scripts', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

    expect(pkg.scripts.lint).toContain('eslint')
    expect(pkg.scripts.typecheck).toContain('vue-tsc')
    expect(pkg.scripts.test).toContain('vitest run')
    expect(pkg.scripts.build).toContain('vite build')
    expect(pkg.scripts['security:scan']).toContain('check-secrets.ps1')
    expect(pkg.scripts['license:scan']).toContain('check-licenses.ps1')
  })

  it('does not gate the dashboard route behind top-level async setup', () => {
    const page = read('src/pages/index.vue')

    expect(page).not.toMatch(/^await\s+/m)
  })

  it('starts light and does not render an internal sidebar', () => {
    expect(read('vite.config.ts')).toContain("colorModeInitialValue: 'light'")
    expect(read('src/layouts/default.vue')).not.toContain('B24DashboardSidebar')
  })

  it('keeps the dashboard trend line-only and bounded by its viewport', () => {
    const trend = read('src/components/dashboard/TrendChart.vue')
    const styles = read('src/assets/css/main.css')

    expect(trend).toContain('VisLine')
    expect(trend).not.toContain('VisArea')
    expect(styles).toMatch(/\.dashboard-shell\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*clip/s)
    expect(styles).toMatch(/\.dashboard-trend-viewport\s*\{[^}]*max-width:\s*100%[^}]*overflow:\s*hidden/s)
    expect(styles).toMatch(/\.dashboard-trend-chart\s*\{[^}]*height:\s*380px/s)
    expect(styles).toContain('--vis-axis-grid-color')
  })
})
