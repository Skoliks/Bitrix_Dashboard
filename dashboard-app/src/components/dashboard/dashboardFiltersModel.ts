import type { BootstrapResponse, DashboardFilterInput, DashboardFilters, DatePreset } from '../../types/dashboard'
import type { SelectOption } from './dashboardViewModel'

export interface FilterChangeResult {
  filters: DashboardFilters
  shouldRefresh: boolean
}

const periodOptions: Array<SelectOption<DatePreset>> = [
  { value: 'last7', label: 'Последние 7 дней' },
  { value: 'last30', label: 'Последние 30 дней' },
  { value: 'last90', label: 'Последние 90 дней' },
  { value: 'currentMonth', label: 'Текущий месяц' },
  { value: 'previousMonth', label: 'Прошлый месяц' },
  { value: 'custom', label: 'Произвольный период' }
]

export const buildCategoryOptions = (categories: BootstrapResponse['categories']): Array<SelectOption<number>> =>
  [...categories]
    .sort((left, right) => left.sort - right.sort || left.id - right.id)
    .map(category => ({ value: category.id, label: category.name }))

export const buildCurrencyOptions = (currencies: BootstrapResponse['currencies']): Array<SelectOption> => [
  { value: 'all', label: 'Все валюты' },
  ...[...currencies]
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id))
    .map(currency => ({ value: currency.id, label: `${currency.id} · ${currency.fullName}` }))
]

export const buildPeriodOptions = (): Array<SelectOption<DatePreset>> => periodOptions

export const buildFilterChange = (
  current: DashboardFilters,
  patch: DashboardFilterInput
): FilterChangeResult => {
  const filters = { ...current, ...patch }
  const changedOnlyCustomDate = Object.keys(patch).every(key => key === 'dateFrom' || key === 'dateTo')
  const switchedToCustom = patch.preset === 'custom' && current.preset !== 'custom'
  const shouldRefresh = filters.preset !== 'custom' || (!changedOnlyCustomDate && !switchedToCustom && canApplyCustomPeriod(filters))

  return {
    filters,
    shouldRefresh
  }
}

export const canApplyCustomPeriod = (filters: DashboardFilters): boolean => {
  if (filters.preset !== 'custom') {
    return true
  }
  if (!filters.dateFrom || !filters.dateTo) {
    return false
  }
  return isCalendarDate(filters.dateFrom) &&
    isCalendarDate(filters.dateTo) &&
    filters.dateFrom <= filters.dateTo
}

export const describePeriod = (filters: DashboardFilters): string =>
  filters.dateFrom && filters.dateTo
    ? `${filters.dateFrom} - ${filters.dateTo}`
    : periodOptions.find(item => item.value === filters.preset)?.label ?? 'Период не выбран'

const isCalendarDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)
