import { describe, expect, it } from 'vitest'

import type { BootstrapResponse, DashboardResponse } from '../../../types/dashboard'
import {
  buildCurrencyOptions,
  buildKpiCards,
  buildPeriodOptions,
  buildRecentDealRows,
  buildStageRows,
  buildWarningMessages
} from '../dashboardViewModel'

const bootstrap: BootstrapResponse = {
  categories: [
    { id: 0, name: 'Main funnel', sort: 10, isLocked: false },
    { id: 2, name: 'Renewals', sort: 20, isLocked: false }
  ],
  stages: [
    { id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process', categoryId: 0 },
    { id: 'PROPOSAL', entityId: 'DEAL_STAGE', name: 'Proposal', sort: 20, semantic: 'process', categoryId: 0 },
    { id: 'WON', entityId: 'DEAL_STAGE', name: 'Won', sort: 30, semantic: 'success', categoryId: 0 }
  ],
  currencies: [
    { id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# ₽', decimals: 2 },
    { id: 'USD', amountCnt: 1, amount: 1, sort: 200, base: false, fullName: 'US Dollar', formatString: '$#', decimals: 2 }
  ],
  users: [{ id: 7, active: true, displayName: 'Anna Manager', timeZone: 'UTC' }],
  timeZone: 'Europe/Moscow',
  defaults: { categoryId: 0, currency: 'all', period: { from: '2026-06-24', to: '2026-07-23' } },
  warnings: []
}

const dashboard: DashboardResponse = {
  filters: { categoryId: 0, preset: 'last30', currency: 'all' },
  references: {
    categories: bootstrap.categories,
    stages: bootstrap.stages,
    currencies: bootstrap.currencies,
    users: bootstrap.users,
    timeZone: bootstrap.timeZone
  },
  kpi: {
    openNow: { count: 4 },
    openCreated: { count: 6 },
    won: { count: 2 },
    wonAmountByCurrency: [
      { currency: 'RUB', amount: 120000 },
      { currency: 'USD', amount: 900 }
    ],
    averageWonAmountByCurrency: [
      { currency: 'RUB', amount: 60000 },
      { currency: 'USD', amount: 450 }
    ]
  },
  stageFunnel: [
    { stageId: 'NEW', name: 'New', sort: 10, semantic: 'process', count: 4, share: 0.8, amountsByCurrency: [{ currency: 'RUB', amount: 120000 }] },
    { stageId: 'WON', name: 'Won', sort: 30, semantic: 'success', count: 1, share: 0.2, amountsByCurrency: [{ currency: 'USD', amount: 900 }] }
  ],
  trend: { bucket: 'day', points: [] },
  recentDeals: [
    { id: 1, title: 'Older deal', amount: 100, currency: 'RUB', categoryId: 0, stageId: 'NEW', stageSemanticId: null, assignedById: 99, assignedName: null, createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-01T10:00:00.000Z', closedAt: null },
    { id: 2, title: 'Newest deal', amount: 0, currency: null, categoryId: 0, stageId: 'WON', stageSemanticId: 'S', assignedById: 7, assignedName: 'Anna Manager', createdAt: '2026-07-20T09:00:00.000Z', updatedAt: '2026-07-20T09:00:00.000Z', closedAt: '2026-07-22T09:00:00.000Z' }
  ],
  warnings: [
    { code: 'USERS_UNAVAILABLE' },
    { code: 'PARTIAL_AGGREGATION' }
  ],
  meta: { partialAggregation: true, truncatedBlocks: ['kpi'], totalRecords: 20, recordsProcessed: 15 }
}

describe('dashboard view model', () => {
  it('offers funnel options without an all funnels choice and provides all currencies', () => {
    const currencyOptions = buildCurrencyOptions(bootstrap.currencies)
    const periodOptions = buildPeriodOptions()

    expect(currencyOptions[0]).toEqual({ value: 'all', label: 'Все валюты' })
    expect(currencyOptions.map(option => option.value)).toEqual(['all', 'RUB', 'USD'])
    expect(periodOptions.map(option => option.value)).toEqual(['last7', 'last30', 'last90', 'currentMonth', 'previousMonth', 'custom'])
  })

  it('keeps KPI money values split by currency', () => {
    const cards = buildKpiCards(dashboard.kpi, bootstrap.currencies)

    expect(cards).toHaveLength(5)
    expect(cards[3]?.money).toEqual(['120 000 ₽', '$900'])
    expect(cards[4]?.money).toEqual(['60 000 ₽', '$450'])
  })

  it('includes zero-count stages in funnel rows', () => {
    const rows = buildStageRows(dashboard.stageFunnel, bootstrap.stages, bootstrap.currencies)

    expect(rows.map(row => [row.stageId, row.count])).toEqual([
      ['NEW', 4],
      ['PROPOSAL', 0],
      ['WON', 1]
    ])
  })

  it('sorts recent deals by createdAt desc and falls back to assignedById', () => {
    const rows = buildRecentDealRows(dashboard.recentDeals, bootstrap.users, bootstrap.currencies)

    expect(rows.map(row => row.id)).toEqual([2, 1])
    expect(rows[1]?.assignedLabel).toBe('#99')
    expect(rows[0]?.amountLabel).toBe('Сумма не указана')
  })

  it('maps warnings to concrete Russian text without blocking data', () => {
    const warnings = buildWarningMessages(dashboard.warnings, dashboard.meta)

    expect(warnings).toEqual([
      expect.objectContaining({ code: 'USERS_UNAVAILABLE', title: 'Имена ответственных недоступны' }),
      expect.objectContaining({ code: 'PARTIAL_AGGREGATION', description: expect.stringContaining('15 из 20') })
    ])
  })
})
