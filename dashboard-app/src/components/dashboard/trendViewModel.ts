import type { DashboardResponse } from '../../types/dashboard'

export type TrendSeries = 'created' | 'won'

export interface TrendSeriesPoint {
  period: string
  count: number
  wonAmountsByCurrency: DashboardResponse['trend']['points'][number]['wonAmountsByCurrency']
}

export const buildTrendSeries = (
  trend: DashboardResponse['trend'],
  series: TrendSeries
): TrendSeriesPoint[] => trend.points.map(point => ({
  period: point.period,
  count: series === 'created' ? point.createdCount : point.wonCount,
  wonAmountsByCurrency: point.wonAmountsByCurrency
}))

export const buildTrendLayout = (pointCount: number, availableWidth: number) => {
  const width = Math.max(0, Math.floor(availableWidth))
  const visibleLabels = Math.max(2, Math.floor(width / 90))

  return {
    width,
    labelEvery: Math.max(1, Math.ceil(pointCount / visibleLabels))
  }
}

export const shouldShowTrendLabel = (index: number, pointCount: number, labelEvery: number): boolean =>
  index === pointCount - 1 || index % labelEvery === 0
