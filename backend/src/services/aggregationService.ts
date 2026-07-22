import type { Currency, Deal, DealCategory, Stage, User } from '../domain/models.js'
import type { DashboardResponse } from '../types/api.js'
import type { AggregateData } from '../vibecode/schemas.js'
import type { ResolvedDateRange } from './dateAdapter.js'
import type { DashboardFilters } from './filterValidation.js'

interface AggregationInput {
  filters: DashboardFilters
  references: {
    categories: DealCategory[]
    stages: Stage[]
    currencies: Currency[]
    users: User[]
    timeZone: string
  }
  range: ResolvedDateRange
  bootstrapWarnings: Array<{ code: 'USERS_UNAVAILABLE' }>
  aggregates: {
    openNow: AggregateData
    openCreated: AggregateData
    won: AggregateData
    funnel: AggregateData
  }
  trendCreatedDeals: Deal[]
  trendWonDeals: Deal[]
  recentDeals: Deal[]
}

type WarningCode = DashboardResponse['warnings'][number]['code']
type Money = DashboardResponse['kpi']['wonAmountByCurrency'][number]
type TrendPoint = DashboardResponse['trend']['points'][number]

export const buildDashboardResponse = (input: AggregationInput): DashboardResponse => {
  const warnings = new Set<WarningCode>(input.bootstrapWarnings.map(warning => warning.code))
  const truncatedBlocks = [
    ...truncatedAggregateBlocks(input.aggregates),
    ...boundedSearchBlocks(input)
  ]
  if (truncatedBlocks.length > 0) {
    warnings.add('PARTIAL_AGGREGATION')
  }

  const stageSemantics = new Map(input.references.stages.map(stage => [stage.id, stage.semantic]))
  if (hasUnknownStageSemantics(input.references.stages, [...input.trendCreatedDeals, ...input.trendWonDeals])) {
    warnings.add('UNKNOWN_STAGE_SEMANTICS')
  }

  const wonMoney = collectMoney(input.trendWonDeals, warnings)
  const wonCountByCurrency = countByCurrency(input.trendWonDeals)
  const createdMoneyByStage = collectMoneyByStage(input.trendCreatedDeals, warnings)

  return {
    filters: input.filters,
    references: input.references,
    kpi: {
      openNow: { count: input.aggregates.openNow.count },
      openCreated: { count: input.aggregates.openCreated.count },
      won: { count: input.aggregates.won.count },
      wonAmountByCurrency: wonMoney,
      averageWonAmountByCurrency: wonMoney.map(row => ({
        currency: row.currency,
        amount: row.amount / (wonCountByCurrency.get(row.currency) ?? 1)
      }))
    },
    stageFunnel: buildStageFunnel(input.references.stages, input.aggregates.funnel, createdMoneyByStage, stageSemantics),
    trend: buildTrend(input.range, input.references.timeZone, input.trendCreatedDeals, input.trendWonDeals, warnings),
    recentDeals: input.recentDeals.map(deal => ({
      ...deal,
      assignedName: input.references.users.find(user => user.id === deal.assignedById)?.displayName ?? (deal.assignedById === null ? null : String(deal.assignedById))
    })),
    warnings: [...warnings].map(code => ({ code })),
    meta: {
      partialAggregation: truncatedBlocks.length > 0,
      truncatedBlocks,
      totalRecords: sumMeta(input.aggregates, 'totalRecords'),
      recordsProcessed: sumMeta(input.aggregates, 'recordsProcessed')
    }
  }
}

const buildStageFunnel = (
  stages: Stage[],
  aggregate: AggregateData,
  amountsByStage: Map<string, Money[]>,
  stageSemantics: Map<string, string | null>
): DashboardResponse['stageFunnel'] => {
  const counts = new Map((aggregate.groups ?? []).map(group => [group.stageId ?? '', group.count]))
  const total = stages.reduce((sum, stage) => sum + (counts.get(stage.id) ?? 0), 0)

  return [...stages]
    .sort((left, right) => left.sort - right.sort)
    .map(stage => {
      const count = counts.get(stage.id) ?? 0
      return {
        stageId: stage.id,
        name: stage.name,
        sort: stage.sort,
        ...(stage.color ? { color: stage.color } : {}),
        semantic: stageSemantics.get(stage.id) ?? null,
        count,
        share: total > 0 ? count / total : 0,
        amountsByCurrency: amountsByStage.get(stage.id) ?? []
      }
    })
}

const buildTrend = (
  range: ResolvedDateRange,
  timeZone: string,
  createdDeals: Deal[],
  wonDeals: Deal[],
  warnings: Set<WarningCode>
): DashboardResponse['trend'] => {
  const bucket = selectTrendBucket(range.dateFrom, range.dateTo)
  const points = new Map<string, TrendPoint>()

  for (const deal of createdDeals) {
    const period = bucketKey(deal.createdAt, bucket, timeZone)
    const point = getTrendPoint(points, period)
    point.createdCount += 1
  }

  for (const deal of wonDeals) {
    if (!deal.closedAt) {
      continue
    }
    const period = bucketKey(deal.closedAt, bucket, timeZone)
    const point = getTrendPoint(points, period)
    point.wonCount += 1
    const money = collectMoney([deal], warnings)
    point.wonAmountsByCurrency = mergeMoney(point.wonAmountsByCurrency, money)
  }

  return {
    bucket,
    points: [...points.values()].sort((left, right) => left.period.localeCompare(right.period))
  }
}

const collectMoney = (deals: Deal[], warnings: Set<WarningCode>): Money[] => {
  const byCurrency = new Map<string, number>()
  for (const deal of deals) {
    if (!deal.currency) {
      warnings.add('INCOMPLETE_FINANCIAL_DATA')
      continue
    }
    byCurrency.set(deal.currency, (byCurrency.get(deal.currency) ?? 0) + deal.amount)
  }
  return [...byCurrency.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => ({ currency, amount }))
}

const collectMoneyByStage = (deals: Deal[], warnings: Set<WarningCode>): Map<string, Money[]> => {
  const byStage = new Map<string, Deal[]>()
  for (const deal of deals) {
    byStage.set(deal.stageId, [...(byStage.get(deal.stageId) ?? []), deal])
  }
  return new Map([...byStage.entries()].map(([stageId, values]) => [stageId, collectMoney(values, warnings)]))
}

const countByCurrency = (deals: Deal[]): Map<string, number> => {
  const result = new Map<string, number>()
  for (const deal of deals) {
    if (deal.currency) {
      result.set(deal.currency, (result.get(deal.currency) ?? 0) + 1)
    }
  }
  return result
}

const mergeMoney = (left: Money[], right: Money[]): Money[] => {
  const merged = new Map(left.map(row => [row.currency, row.amount]))
  for (const row of right) {
    merged.set(row.currency, (merged.get(row.currency) ?? 0) + row.amount)
  }
  return [...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount }))
}

const selectTrendBucket = (dateFrom: string, dateTo: string): DashboardResponse['trend']['bucket'] => {
  const days = dayNumber(dateTo) - dayNumber(dateFrom) + 1
  if (days > 180) {
    return 'month'
  }
  if (days > 45) {
    return 'week'
  }
  return 'day'
}

const bucketKey = (isoDate: string, bucket: DashboardResponse['trend']['bucket'], timeZone: string): string => {
  const date = new Date(isoDate)
  const local = localDateParts(date, timeZone)
  if (bucket === 'month') {
    return `${local.year}-${pad(local.month)}`
  }
  if (bucket === 'week') {
    const monday = new Date(Date.UTC(local.year, local.month - 1, local.day))
    const day = monday.getUTCDay() || 7
    monday.setUTCDate(monday.getUTCDate() - day + 1)
    return monday.toISOString().slice(0, 10)
  }
  return `${local.year}-${pad(local.month)}-${pad(local.day)}`
}

const getTrendPoint = (points: Map<string, TrendPoint>, period: string): TrendPoint => {
  const existing = points.get(period)
  if (existing) {
    return existing
  }
  const created = { period, createdCount: 0, wonCount: 0, wonAmountsByCurrency: [] }
  points.set(period, created)
  return created
}

const truncatedAggregateBlocks = (aggregates: AggregationInput['aggregates']): string[] =>
  Object.entries(aggregates)
    .filter(([, aggregate]) => aggregate.meta.truncated)
    .map(([key]) => key)

const boundedSearchBlocks = (input: AggregationInput): string[] => {
  const blocks: string[] = []
  if (input.trendCreatedDeals.length >= 500) {
    blocks.push('trendCreated')
  }
  if (input.trendWonDeals.length >= 500) {
    blocks.push('trendWon')
  }
  return blocks
}

const sumMeta = (
  aggregates: AggregationInput['aggregates'],
  key: 'totalRecords' | 'recordsProcessed'
): number =>
  Object.values(aggregates).reduce((sum, aggregate) => sum + aggregate.meta[key], 0)

const hasUnknownStageSemantics = (stages: Stage[], deals: Deal[]): boolean => {
  const stageSemantics = new Map(stages.map(stage => [stage.id, stage.semantic]))
  return deals.some(deal => {
    const semantic = normalizeSemantic(deal.stageSemanticId) ?? normalizeSemantic(stageSemantics.get(deal.stageId))
    return semantic === null
  })
}

const normalizeSemantic = (semantic: string | null | undefined): 'process' | 'success' | 'failure' | null => {
  if (semantic === 'P' || semantic === 'process') {
    return 'process'
  }
  if (semantic === 'S' || semantic === 'success') {
    return 'success'
  }
  if (semantic === 'F' || semantic === 'failure') {
    return 'failure'
  }
  return null
}

const dayNumber = (value: string): number =>
  Math.floor(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))) / 86_400_000)

const localDateParts = (date: Date, timeZone: string): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const value = (type: string): number => Number(parts.find(part => part.type === type)?.value)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day')
  }
}

const pad = (value: number): string => String(value).padStart(2, '0')
