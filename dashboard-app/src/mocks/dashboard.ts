import type { BootstrapResponse, DashboardResponse } from '../types/dashboard'

export const mockBootstrap: BootstrapResponse = {
  categories: [{ id: 0, name: 'Основная воронка', sort: 10, isLocked: false }],
  stages: [
    { id: 'NEW', entityId: 'DEAL_STAGE', name: 'Новая', sort: 10, semantic: 'process' },
    { id: 'QUALIFICATION', entityId: 'DEAL_STAGE', name: 'Квалификация', sort: 20, semantic: 'process' },
    { id: 'PROPOSAL', entityId: 'DEAL_STAGE', name: 'Предложение', sort: 30, semantic: 'process' },
    { id: 'NEGOTIATION', entityId: 'DEAL_STAGE', name: 'Переговоры', sort: 40, semantic: 'process' },
    { id: 'WON', entityId: 'DEAL_STAGE', name: 'Успешная', sort: 50, semantic: 'success' }
  ],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Рубль', formatString: '# RUB', decimals: 2 }],
  users: [
    { id: 1, active: true, displayName: 'Анна Волкова', timeZone: 'Asia/Yakutsk' },
    { id: 2, active: true, displayName: 'Михаил Петров', timeZone: 'Asia/Yakutsk' }
  ],
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
      count: 25,
      amountsByCurrency: [{ currency: 'RUB', amount: 1720000 }]
    },
    openCreated: { count: 11 },
    won: { count: 6 },
    wonAmountByCurrency: [{ currency: 'RUB', amount: 910000 }],
    averageWonAmountByCurrency: [{ currency: 'RUB', amount: 151666.67 }]
  },
  stageFunnel: [
    { stageId: 'NEW', name: 'Новая', sort: 10, semantic: 'process', count: 10, share: 0.32, amountsByCurrency: [{ currency: 'RUB', amount: 520000 }] },
    { stageId: 'QUALIFICATION', name: 'Квалификация', sort: 20, semantic: 'process', count: 7, share: 0.23, amountsByCurrency: [{ currency: 'RUB', amount: 410000 }] },
    { stageId: 'PROPOSAL', name: 'Предложение', sort: 30, semantic: 'process', count: 5, share: 0.16, amountsByCurrency: [{ currency: 'RUB', amount: 380000 }] },
    { stageId: 'NEGOTIATION', name: 'Переговоры', sort: 40, semantic: 'process', count: 3, share: 0.1, amountsByCurrency: [{ currency: 'RUB', amount: 410000 }] },
    { stageId: 'WON', name: 'Успешная', sort: 50, semantic: 'success', count: 6, share: 0.19, amountsByCurrency: [{ currency: 'RUB', amount: 910000 }] }
  ],
  trend: {
    bucket: 'day',
    points: [
      { period: '2026-07-01', createdCount: 2, wonCount: 0, wonAmountsByCurrency: [] },
      { period: '2026-07-03', createdCount: 1, wonCount: 1, wonAmountsByCurrency: [{ currency: 'RUB', amount: 120000 }] },
      { period: '2026-07-06', createdCount: 3, wonCount: 0, wonAmountsByCurrency: [] },
      { period: '2026-07-09', createdCount: 2, wonCount: 1, wonAmountsByCurrency: [{ currency: 'RUB', amount: 180000 }] },
      { period: '2026-07-12', createdCount: 1, wonCount: 0, wonAmountsByCurrency: [] },
      { period: '2026-07-16', createdCount: 4, wonCount: 1, wonAmountsByCurrency: [{ currency: 'RUB', amount: 250000 }] },
      { period: '2026-07-20', createdCount: 2, wonCount: 0, wonAmountsByCurrency: [] },
      { period: '2026-07-24', createdCount: 3, wonCount: 3, wonAmountsByCurrency: [{ currency: 'RUB', amount: 360000 }] },
      { period: '2026-07-28', createdCount: 1, wonCount: 0, wonAmountsByCurrency: [] },
      { period: '2026-07-31', createdCount: 2, wonCount: 0, wonAmountsByCurrency: [] }
    ]
  },
  recentDeals: [
    { id: 101, title: 'Внедрение CRM для отдела продаж', amount: 240000, currency: 'RUB', categoryId: 0, stageId: 'NEGOTIATION', stageSemanticId: 'P', assignedById: 1, assignedName: 'Анна Волкова', createdAt: '2026-07-29T09:00:00.000Z', updatedAt: '2026-07-31T10:30:00.000Z', closedAt: null },
    { id: 102, title: 'Лицензии для филиала', amount: 180000, currency: 'RUB', categoryId: 0, stageId: 'WON', stageSemanticId: 'S', assignedById: 2, assignedName: 'Михаил Петров', createdAt: '2026-07-20T08:00:00.000Z', updatedAt: '2026-07-24T14:00:00.000Z', closedAt: '2026-07-24T14:00:00.000Z' },
    { id: 103, title: 'Аудит текущей воронки', amount: 95000, currency: 'RUB', categoryId: 0, stageId: 'PROPOSAL', stageSemanticId: 'P', assignedById: 1, assignedName: 'Анна Волкова', createdAt: '2026-07-22T11:00:00.000Z', updatedAt: '2026-07-29T09:15:00.000Z', closedAt: null },
    { id: 104, title: 'Обучение команды продаж', amount: 120000, currency: 'RUB', categoryId: 0, stageId: 'WON', stageSemanticId: 'S', assignedById: 1, assignedName: 'Анна Волкова', createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-03T16:20:00.000Z', closedAt: '2026-07-03T16:20:00.000Z' },
    { id: 105, title: 'Интеграция телефонии', amount: 310000, currency: 'RUB', categoryId: 0, stageId: 'QUALIFICATION', stageSemanticId: 'P', assignedById: 2, assignedName: 'Михаил Петров', createdAt: '2026-07-24T13:00:00.000Z', updatedAt: '2026-07-28T11:45:00.000Z', closedAt: null },
    { id: 106, title: 'Настройка аналитики', amount: 160000, currency: 'RUB', categoryId: 0, stageId: 'WON', stageSemanticId: 'S', assignedById: 2, assignedName: 'Михаил Петров', createdAt: '2026-07-25T09:30:00.000Z', updatedAt: '2026-07-31T12:10:00.000Z', closedAt: '2026-07-31T12:10:00.000Z' },
    { id: 107, title: 'Пакет поддержки на год', amount: 72000, currency: 'RUB', categoryId: 0, stageId: 'NEW', stageSemanticId: 'P', assignedById: 1, assignedName: 'Анна Волкова', createdAt: '2026-07-30T15:00:00.000Z', updatedAt: '2026-07-30T15:00:00.000Z', closedAt: null },
    { id: 108, title: 'Автоматизация отчётности', amount: 280000, currency: 'RUB', categoryId: 0, stageId: 'QUALIFICATION', stageSemanticId: 'P', assignedById: 2, assignedName: 'Михаил Петров', createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-31T09:40:00.000Z', closedAt: null }
  ],
  warnings: [],
  meta: { partialAggregation: false, truncatedBlocks: [], totalRecords: 0, recordsProcessed: 0 }
}
