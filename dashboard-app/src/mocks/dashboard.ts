import type { BootstrapResponse, DashboardResponse } from '../types/dashboard'

export const mockBootstrap: BootstrapResponse = {
  categories: [{ id: 0, name: 'Основная воронка', sort: 10, isLocked: false }],
  stages: [
    { id: 'NEW', entityId: 'DEAL_STAGE', name: 'Новая', sort: 10, semantic: 'process' },
    { id: 'WON', entityId: 'DEAL_STAGE', name: 'Успешная', sort: 20, semantic: 'success' }
  ],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Рубль', formatString: '# RUB', decimals: 2 }],
  users: [{ id: 1, active: true, displayName: 'Менеджер', timeZone: 'Asia/Yakutsk' }],
  timeZone: 'Asia/Yakutsk',
  defaults: {
    categoryId: 0,
    currency: 'all',
    period: { from: '2026-07-01', to: '2026-07-31' }
  },
  warnings: []
}

export const mockDashboard: DashboardResponse = {
  filters: { categoryId: 0, preset: 'last30', currency: 'all' },
  references: {
    categories: mockBootstrap.categories,
    stages: mockBootstrap.stages,
    currencies: mockBootstrap.currencies,
    users: mockBootstrap.users,
    timeZone: mockBootstrap.timeZone
  },
  kpi: {
    openNow: {
      count: 12,
      amountsByCurrency: [{ currency: 'RUB', amount: 180000 }]
    },
    openCreated: { count: 8 },
    won: { count: 5 },
    wonAmountByCurrency: [{ currency: 'RUB', amount: 250000 }],
    averageWonAmountByCurrency: [{ currency: 'RUB', amount: 50000 }]
  },
  stageFunnel: [
    { stageId: 'NEW', name: 'Новая', sort: 10, semantic: 'process', count: 8, share: 0.62, amountsByCurrency: [{ currency: 'RUB', amount: 180000 }] },
    { stageId: 'WON', name: 'Успешная', sort: 20, semantic: 'success', count: 5, share: 0.38, amountsByCurrency: [{ currency: 'RUB', amount: 250000 }] }
  ],
  trend: {
    bucket: 'day',
    points: [
      { period: '2026-07-01', createdCount: 2, wonCount: 1, wonAmountsByCurrency: [{ currency: 'RUB', amount: 50000 }] }
    ]
  },
  recentDeals: [
    { id: 1, title: 'Тестовая сделка', amount: 50000, currency: 'RUB', categoryId: 0, stageId: 'WON', stageSemanticId: 'S', assignedById: 1, assignedName: 'Менеджер', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z', closedAt: '2026-07-02T00:00:00.000Z' }
  ],
  warnings: [],
  meta: { partialAggregation: false, truncatedBlocks: [], totalRecords: 0, recordsProcessed: 0 }
}
