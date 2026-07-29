export type DashboardThemePreference = 'light' | 'dark' | 'system'

export const getDashboardThemeToggle = (preference: DashboardThemePreference | string | undefined) =>
  preference === 'dark'
    ? { icon: 'sun' as const, nextPreference: 'light' as const }
    : { icon: 'moon' as const, nextPreference: 'dark' as const }
