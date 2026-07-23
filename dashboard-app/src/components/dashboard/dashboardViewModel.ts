import type {
  BootstrapResponse,
  DashboardFilters,
  DashboardResponse,
  DashboardWarning,
} from '../../types/dashboard'
import {
  buildCategoryOptions,
  buildCurrencyOptions,
  buildFilterChange,
  buildPeriodOptions,
  canApplyCustomPeriod,
  describePeriod
} from './dashboardFiltersModel'
import { firstMoneyOrZero, formatCount, formatDate, formatDateTime, formatMoney, formatMoneyList } from './dashboardFormatters'

export {
  buildCategoryOptions,
  buildCurrencyOptions,
  buildFilterChange,
  buildPeriodOptions,
  canApplyCustomPeriod,
  formatCount,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyList
}

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
}

export interface KpiCardView {
  key: string
  title: string
  value: string
  description: string
  money?: string[]
}

export interface StageRowView {
  stageId: string
  name: string
  count: number
  share: number
  color?: string
  semantic: string | null
  money: string[]
  moneyDescription?: string
}

export interface RecentDealRowView {
  id: number
  title: string
  amountLabel: string
  stageLabel: string
  assignedLabel: string
  createdAtLabel: string
  dealUrl?: string
}

export interface WarningMessageView {
  code: DashboardWarning['code']
  title: string
  description: string
}

export interface DashboardErrorView {
  description?: string
  requestId?: string
}

export const buildKpiCards = (
  kpi: DashboardResponse['kpi'],
  currencies: BootstrapResponse['currencies'],
  meta?: DashboardResponse['meta']
): KpiCardView[] => [
  {
    key: 'openNow',
    title: 'Открыто сейчас',
    value: formatCount(kpi.openNow.count),
    description: 'Сделки в работе на текущий момент'
  },
  {
    key: 'openCreated',
    title: 'Создано за период',
    value: formatCount(kpi.openCreated.count),
    description: 'Новые сделки по выбранным фильтрам'
  },
  {
    key: 'won',
    title: 'Выиграно за период',
    value: formatCount(kpi.won.count),
    description: 'Успешно закрытые сделки'
  },
  {
    key: 'wonAmount',
    title: 'Сумма выигранных',
    value: firstMoneyOrZero(kpi.wonAmountByCurrency, currencies),
    description: isMoneyKpiPartial(meta) ? 'Рассчитано частично, валюты не объединяются' : 'Валюты не объединяются',
    money: formatMoneyList(kpi.wonAmountByCurrency, currencies)
  },
  {
    key: 'averageWon',
    title: 'Средний чек',
    value: firstMoneyOrZero(kpi.averageWonAmountByCurrency, currencies),
    description: isMoneyKpiPartial(meta) ? 'Рассчитано частично по выигранным сделкам' : 'По выигранным сделкам',
    money: formatMoneyList(kpi.averageWonAmountByCurrency, currencies)
  }
]

const isMoneyKpiPartial = (meta?: DashboardResponse['meta']): boolean =>
  meta?.truncatedBlocks.includes('moneyKpi') ?? false

export const buildStageRows = (
  stageFunnel: DashboardResponse['stageFunnel'],
  stages: BootstrapResponse['stages'],
  currencies: BootstrapResponse['currencies'],
  categoryId = 0,
  meta?: DashboardResponse['meta']
): StageRowView[] => {
  const byStageId = new Map(stageFunnel.map(stage => [stage.stageId, stage]))
  const availableStages = stages
    .filter(stage => stage.categoryId === undefined || stage.categoryId === categoryId)
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id))
  const moneyDescription = meta?.truncatedBlocks.includes('trendCreated')
    ? 'Денежные суммы рассчитаны частично'
    : undefined

  return availableStages.map(stage => {
    const aggregate = byStageId.get(stage.id)
    return {
      stageId: stage.id,
      name: aggregate?.name ?? stage.name,
      count: aggregate?.count ?? 0,
      share: aggregate?.share ?? 0,
      color: aggregate?.color ?? stage.color,
      semantic: aggregate?.semantic ?? stage.semantic,
      money: formatMoneyList(aggregate?.amountsByCurrency ?? [], currencies),
      ...(moneyDescription ? { moneyDescription } : {})
    }
  })
}

export const buildDashboardErrorState = (error: Error | null): DashboardErrorView => ({
  ...(error?.message ? { description: error.message } : {}),
  ...((error as (Error & { requestId?: string }) | null)?.requestId ? { requestId: (error as Error & { requestId: string }).requestId } : {})
})

export const buildRecentDealRows = (
  deals: DashboardResponse['recentDeals'],
  users: BootstrapResponse['users'],
  currencies: BootstrapResponse['currencies'],
  stages: BootstrapResponse['stages'] = []
): RecentDealRowView[] => {
  const usersById = new Map(users.map(user => [user.id, user.displayName || `#${user.id}`]))
  const stagesById = new Map(stages.map(stage => [stage.id, stage.name]))

  return [...deals]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 15)
    .map(deal => ({
      id: deal.id,
      title: deal.title,
      amountLabel: deal.currency ? formatMoney({ currency: deal.currency, amount: deal.amount }, currencies) : 'Сумма не указана',
      stageLabel: stagesById.get(deal.stageId) ?? deal.stageId,
      assignedLabel: deal.assignedName ?? (deal.assignedById ? usersById.get(deal.assignedById) ?? `#${deal.assignedById}` : 'Не назначен'),
      createdAtLabel: formatDateTime(deal.createdAt),
      dealUrl: (deal as unknown as { dealUrl?: string }).dealUrl
    }))
}

export const buildWarningMessages = (
  warnings: DashboardWarning[],
  meta?: DashboardResponse['meta']
): WarningMessageView[] => warnings.map(warning => {
  if (warning.code === 'USERS_UNAVAILABLE') {
    return {
      code: warning.code,
      title: 'Имена ответственных недоступны',
      description: 'В таблице показывается ID ответственного. Остальные данные дашборда доступны.'
    }
  }
  if (warning.code === 'INCOMPLETE_FINANCIAL_DATA') {
    return {
      code: warning.code,
      title: 'Есть сделки без суммы или валюты',
      description: 'Такие сделки учтены в количестве, но исключены из денежных показателей.'
    }
  }
  if (warning.code === 'UNKNOWN_STAGE_SEMANTICS') {
    return {
      code: warning.code,
      title: 'Часть стадий без понятной семантики',
      description: 'Данные показаны без догадок по названиям стадий.'
    }
  }
  return {
    code: warning.code,
    title: 'Данные рассчитаны частично',
    description: meta
      ? `Обработано ${formatCount(meta.recordsProcessed)} из ${formatCount(meta.totalRecords)} записей. Проверьте фильтры или сократите период.`
      : 'Часть агрегированных блоков может быть неполной.'
  }
})

export const describeFilters = (
  filters: DashboardFilters,
  references: DashboardResponse['references']
): string => {
  const category = references.categories.find(item => item.id === filters.categoryId)?.name ?? `Воронка #${filters.categoryId}`
  const period = describePeriod(filters)
    .split(' - ')
    .map(value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value)
    .join(' - ')
  const currency = filters.currency === 'all' ? 'Все валюты' : filters.currency
  return `${category} · ${period} · ${currency} · ${references.timeZone}`
}
