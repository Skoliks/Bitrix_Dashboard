import { describe, expect, it } from 'vitest'
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
