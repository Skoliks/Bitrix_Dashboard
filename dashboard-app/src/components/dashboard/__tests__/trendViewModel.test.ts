import { describe, expect, it } from 'vitest'
import type { DashboardResponse } from '../../../types/dashboard'
import { buildTrendLayout, buildTrendSeries } from '../trendViewModel'

const trend: DashboardResponse['trend'] = {
  bucket: 'week',
  points: [
    { period: '2026-07-06', createdCount: 3, wonCount: 1, wonAmountsByCurrency: [{ currency: 'RUB', amount: 100 }] },
    { period: '2026-07-13', createdCount: 0, wonCount: 0, wonAmountsByCurrency: [] }
  ]
}

describe('trend view model', () => {
  it('keeps zero periods and won money in the selected series', () => {
    expect(buildTrendSeries(trend, 'created').map(point => point.count)).toEqual([3, 0])
    expect(buildTrendSeries(trend, 'won').map(point => point.count)).toEqual([1, 0])
    expect(buildTrendSeries(trend, 'won')[0]?.wonAmountsByCurrency).toEqual([{ currency: 'RUB', amount: 100 }])
  })

  it('uses the available chart width and reduces labels for dense ranges', () => {
    expect(buildTrendLayout(7, 360)).toEqual({ width: 360, labelEvery: 2 })
    expect(buildTrendLayout(30, 360)).toEqual({ width: 360, labelEvery: 8 })
    expect(buildTrendLayout(90, 359.9).width).toBeLessThanOrEqual(359)
    expect(buildTrendLayout(30, -1).width).toBe(0)
  })
})
