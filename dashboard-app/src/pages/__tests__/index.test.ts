import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDashboardThemeToggle } from '../../components/dashboard/dashboardTheme'

describe('dashboard theme toggle', () => {
  it('shows a moon in light mode and switches the preference to dark', () => {
    expect(getDashboardThemeToggle('light')).toEqual({ icon: 'moon', nextPreference: 'dark' })
  })

  it('shows a sun in dark mode and switches the preference back to light', () => {
    const darkPreference = getDashboardThemeToggle('light').nextPreference

    expect(getDashboardThemeToggle(darkPreference)).toEqual({ icon: 'sun', nextPreference: 'light' })
  })
})

describe('dashboard filter placement', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

  it('keeps the pipeline selector at the top and the time filters with the chart', () => {
    expect(read('src/pages/index.vue')).toContain('<PipelineSelector')
    expect(read('src/pages/index.vue')).not.toMatch(/<DashboardFilters(?:\s|\n)/)
    expect(read('src/components/dashboard/TrendChart.vue')).toContain('<TrendFilters')
  })
})
