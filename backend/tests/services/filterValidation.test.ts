import { describe, expect, it } from 'vitest'

import { AppError } from '../../src/http/errors.js'
import { validateDashboardFilters } from '../../src/services/filterValidation.js'

const currencies = [
  { id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# ₽', decimals: 2 },
  { id: 'USD', amountCnt: 1, amount: 1, sort: 200, base: false, fullName: 'Dollar', formatString: '$#', decimals: 2 }
]

describe('filter validation', () => {
  it('accepts known category, all currency and calendar dates', () => {
    expect(validateDashboardFilters({
      input: {
        categoryId: 0,
        preset: 'custom',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-22',
        currency: 'all'
      },
      categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
      currencies
    })).toEqual({
      categoryId: 0,
      preset: 'custom',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-22',
      currency: 'all'
    })
  })

  it.each([
    ['unknown category', { categoryId: 9, preset: 'last30', currency: 'all' }],
    ['empty category', { categoryId: '', preset: 'last30', currency: 'all' }],
    ['blank category', { categoryId: '   ', preset: 'last30', currency: 'all' }],
    ['invalid date format', { categoryId: 0, preset: 'custom', dateFrom: '2026-7-01', dateTo: '2026-07-22', currency: 'all' }],
    ['invalid calendar date', { categoryId: 0, preset: 'custom', dateFrom: '2026-02-28', dateTo: '2026-02-31', currency: 'all' }],
    ['inverted date range', { categoryId: 0, preset: 'custom', dateFrom: '2026-07-22', dateTo: '2026-07-01', currency: 'all' }],
    ['unknown currency', { categoryId: 0, preset: 'last30', currency: 'EUR' }]
  ])('rejects %s with INVALID_FILTERS', (_label, input) => {
    expect(() => validateDashboardFilters({
      input,
      categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
      currencies
    })).toThrow(AppError)

    try {
      validateDashboardFilters({
        input,
        categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
        currencies
      })
    } catch (error) {
      expect(error).toMatchObject({
        code: 'INVALID_FILTERS',
        status: 400
      })
    }
  })

  it('returns a clear message for impossible calendar dates', () => {
    expect(() => validateDashboardFilters({
      input: {
        categoryId: 0,
        preset: 'custom',
        dateFrom: '2026-02-28',
        dateTo: '2026-02-31',
        currency: 'all'
      },
      categories: [{ id: 0, name: 'Main', sort: 10, isLocked: false }],
      currencies
    })).toThrow('Dates must be valid calendar dates.')
  })
})
