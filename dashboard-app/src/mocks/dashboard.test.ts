import { describe, expect, it } from 'vitest'
import { mockBootstrap, mockDashboard } from './dashboard'

describe('public demo data', () => {
  it('shows a realistic funnel and won-deal trend', () => {
    expect(mockBootstrap.stages).toHaveLength(5)
    expect(mockDashboard.recentDeals).toHaveLength(8)
    expect(mockDashboard.recentDeals.filter(deal => deal.stageId === 'WON')).toHaveLength(3)
    expect(mockDashboard.trend.points.filter(point => point.wonCount > 0)).toHaveLength(4)
  })
})
