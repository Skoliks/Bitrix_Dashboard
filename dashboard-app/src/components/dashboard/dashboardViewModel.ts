import type {
  BootstrapResponse,
  DashboardFilters,
  DashboardResponse,
  DashboardWarning,
  DatePreset,
  MoneyAmount
} from '../../types/dashboard'

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

export const buildKpiCards = (
  kpi: DashboardResponse['kpi'],
  currencies: BootstrapResponse['currencies']
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
    value: moneySummary(kpi.wonAmountByCurrency),
    description: 'Валюты не объединяются',
    money: formatMoneyList(kpi.wonAmountByCurrency, currencies)
  },
  {
    key: 'averageWon',
    title: 'Средний чек',
    value: moneySummary(kpi.averageWonAmountByCurrency),
    description: 'По выигранным сделкам',
    money: formatMoneyList(kpi.averageWonAmountByCurrency, currencies)
  }
]

export const buildStageRows = (
  stageFunnel: DashboardResponse['stageFunnel'],
  stages: BootstrapResponse['stages'],
  currencies: BootstrapResponse['currencies'],
  categoryId = 0
): StageRowView[] => {
  const byStageId = new Map(stageFunnel.map(stage => [stage.stageId, stage]))
  const availableStages = stages
    .filter(stage => stage.categoryId === undefined || stage.categoryId === categoryId)
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id))

  return availableStages.map(stage => {
    const aggregate = byStageId.get(stage.id)
    return {
      stageId: stage.id,
      name: aggregate?.name ?? stage.name,
      count: aggregate?.count ?? 0,
      share: aggregate?.share ?? 0,
      color: aggregate?.color ?? stage.color,
      semantic: aggregate?.semantic ?? stage.semantic,
      money: formatMoneyList(aggregate?.amountsByCurrency ?? [], currencies)
    }
  })
}

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
  const period = filters.dateFrom && filters.dateTo
    ? `${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
    : periodOptions.find(item => item.value === filters.preset)?.label ?? 'Период не выбран'
  const currency = filters.currency === 'all' ? 'Все валюты' : filters.currency
  return `${category} · ${period} · ${currency} · ${references.timeZone}`
}

export const formatMoneyList = (
  amounts: MoneyAmount[],
  currencies: BootstrapResponse['currencies']
): string[] => amounts.map(amount => formatMoney(amount, currencies))

export const formatMoney = (
  amount: MoneyAmount,
  currencies: BootstrapResponse['currencies']
): string => {
  const currency = currencies.find(item => item.id === amount.currency)
  const value = formatAmount(amount.amount)
  if (!currency) {
    return `${value} ${amount.currency}`
  }

  if (currency.formatString.includes('#')) {
    return currency.formatString.replace('#', value).trim()
  }
  return `${value} ${currency.id}`
}

export const formatCount = (value: number): string => formatAmount(value)

export const formatDate = (value: string): string => new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(`${value}T00:00:00`))

export const formatDateTime = (value: string): string => new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

const moneySummary = (amounts: MoneyAmount[]): string => amounts.length ? `${amounts.length} вал.` : '0'

const formatAmount = (value: number): string => {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(2)
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
