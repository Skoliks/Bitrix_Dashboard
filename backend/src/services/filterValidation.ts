import type { Currency, DealCategory } from '../domain/models.js'
import { AppError } from '../http/errors.js'
import { calendarDatePattern, compareCalendarDates, parseCalendarDate, type DatePreset } from './dateAdapter.js'

export interface DashboardFilterInput {
  categoryId?: unknown
  preset?: unknown
  dateFrom?: unknown
  dateTo?: unknown
  currency?: unknown
}

export interface DashboardFilters {
  categoryId: number
  preset: DatePreset
  dateFrom?: string
  dateTo?: string
  currency: 'all' | string
}

interface ValidationContext {
  input: DashboardFilterInput
  categories: DealCategory[]
  currencies: Currency[]
}

const presets = new Set<DatePreset>(['last7', 'last30', 'last90', 'currentMonth', 'previousMonth', 'custom'])

export const validateDashboardFilters = (context: ValidationContext): DashboardFilters => {
  const categoryId = readCategoryId(context.input.categoryId, context.categories)
  const preset = readPreset(context.input.preset)
  const currency = readCurrency(context.input.currency, context.currencies)
  const customDates = readCustomDates(preset, context.input.dateFrom, context.input.dateTo)

  return {
    categoryId,
    preset,
    ...customDates,
    currency
  }
}

const readCategoryId = (value: unknown, categories: DealCategory[]): number => {
  if (value === undefined || value === null) {
    throw invalidFilters('Invalid categoryId.')
  }

  const categoryText = typeof value === 'string' ? value.trim() : value
  if (categoryText === '') {
    throw invalidFilters('Invalid categoryId.')
  }

  const categoryId = typeof categoryText === 'number' ? categoryText : Number(categoryText)
  if (!Number.isInteger(categoryId) || categoryId < 0 || !categories.some(category => category.id === categoryId)) {
    throw invalidFilters('Invalid categoryId.')
  }

  return categoryId
}

const readPreset = (value: unknown): DatePreset => {
  const preset = value === undefined ? 'last30' : String(value)
  if (!presets.has(preset as DatePreset)) {
    throw invalidFilters('Invalid date preset.')
  }

  return preset as DatePreset
}

const readCurrency = (value: unknown, currencies: Currency[]): 'all' | string => {
  const currency = value === undefined ? 'all' : String(value)
  if (currency === 'all' || currencies.some(item => item.id === currency)) {
    return currency
  }

  throw invalidFilters('Invalid currency.')
}

const readCustomDates = (
  preset: DatePreset,
  dateFrom: unknown,
  dateTo: unknown
): { dateFrom?: string; dateTo?: string } => {
  if (preset !== 'custom') {
    return {}
  }

  if (typeof dateFrom !== 'string' || typeof dateTo !== 'string') {
    throw invalidFilters('Custom range requires dateFrom and dateTo.')
  }

  if (!calendarDatePattern.test(dateFrom) || !calendarDatePattern.test(dateTo)) {
    throw invalidFilters('Dates must use YYYY-MM-DD.')
  }

  try {
    parseCalendarDate(dateFrom)
    parseCalendarDate(dateTo)
  } catch {
    throw invalidFilters('Dates must be valid calendar dates.')
  }

  if (compareCalendarDates(dateFrom, dateTo) > 0) {
    throw invalidFilters('dateFrom must be before or equal to dateTo.')
  }

  return { dateFrom, dateTo }
}

const invalidFilters = (message: string): AppError => new AppError('INVALID_FILTERS', message, 400)
