import { describe, expect, it } from 'vitest'

import { resolveDateRange } from '../../src/services/dateAdapter.js'

describe('date adapter', () => {
  it('resolves rolling presets as calendar days in portal timezone', () => {
    const range = resolveDateRange({
      preset: 'last7',
      timeZone: 'Asia/Yakutsk',
      now: new Date('2026-07-22T05:00:00.000Z')
    })

    expect(range).toEqual({
      dateFrom: '2026-07-16',
      dateTo: '2026-07-22',
      startAt: '2026-07-15T15:00:00.000Z',
      endAt: '2026-07-22T14:59:59.999Z'
    })
  })

  it('handles month and leap-year boundaries without parsing YYYY-MM-DD as UTC business dates', () => {
    expect(resolveDateRange({
      preset: 'previousMonth',
      timeZone: 'UTC',
      now: new Date('2024-03-15T12:00:00.000Z')
    })).toMatchObject({
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
      startAt: '2024-02-01T00:00:00.000Z',
      endAt: '2024-02-29T23:59:59.999Z'
    })

    expect(resolveDateRange({
      preset: 'currentMonth',
      timeZone: 'America/New_York',
      now: new Date('2026-01-01T05:30:00.000Z')
    })).toMatchObject({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-01'
    })
  })

  it('uses explicit calendar dates for custom ranges', () => {
    expect(resolveDateRange({
      preset: 'custom',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-22',
      timeZone: 'UTC',
      now: new Date('2026-07-22T05:00:00.000Z')
    })).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-22',
      startAt: '2026-07-01T00:00:00.000Z',
      endAt: '2026-07-22T23:59:59.999Z'
    })
  })

  it('resolves UTC boundaries across daylight saving time changes', () => {
    expect(resolveDateRange({
      preset: 'custom',
      dateFrom: '2026-03-08',
      dateTo: '2026-03-08',
      timeZone: 'America/New_York',
      now: new Date('2026-03-08T12:00:00.000Z')
    })).toEqual({
      dateFrom: '2026-03-08',
      dateTo: '2026-03-08',
      startAt: '2026-03-08T05:00:00.000Z',
      endAt: '2026-03-09T03:59:59.999Z'
    })
  })
})
