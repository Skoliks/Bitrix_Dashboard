/* eslint-disable vue/one-component-per-file */
import { createApp, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@unovis/vue', async () => {
  const { defineComponent, h } = await import('vue')
  const container = defineComponent({
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => h('div', attrs, slots.default?.())
  })
  const primitive = defineComponent({
    setup: () => () => h('div')
  })

  return {
    VisAxis: primitive,
    VisGroupedBar: primitive,
    VisTooltip: primitive,
    VisXYContainer: container
  }
})

import type { DashboardResponse } from '../../../types/dashboard'
import TrendChart from '../TrendChart.vue'

const category2Trend: DashboardResponse['trend'] = {
  bucket: 'day',
  points: [
    { period: '2026-07-01', createdCount: 2, wonCount: 1, wonAmountsByCurrency: [] },
    { period: '2026-07-02', createdCount: 0, wonCount: 0, wonAmountsByCurrency: [] }
  ]
}

const category4Trend: DashboardResponse['trend'] = {
  bucket: 'day',
  points: [
    { period: '2026-07-15', createdCount: 1, wonCount: 0, wonAmountsByCurrency: [] }
  ]
}

const filters = { categoryId: 0, preset: 'last30' as const, currency: 'all' as const }

const mountedApps: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const { unmount, host } of mountedApps.splice(0)) {
    unmount()
    host.remove()
  }
})

describe('TrendChart', () => {
  it('replaces chart points when the selected category changes', async () => {
    const trend = ref(category2Trend)
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () => h(TrendChart, { trend: trend.value, filters, currencies: [] })
    })
    app.component('B24Card', {
      template: '<section><slot name="header" /><slot /></section>'
    })
    app.mount(host)
    mountedApps.push({ unmount: () => app.unmount(), host })

    expect(host.querySelector('[data-test="trend-point-count"]')?.textContent).toBe('2')
    expect(host.querySelector('[data-test="trend-periods"]')?.textContent).toContain('2026-07-01')

    trend.value = category4Trend
    await nextTick()

    expect(host.querySelector('[data-test="trend-point-count"]')?.textContent).toBe('1')
    expect(host.querySelector('[data-test="trend-periods"]')?.textContent).toContain('2026-07-15')
    expect(host.querySelector('[data-test="trend-periods"]')?.textContent).not.toContain('2026-07-01')
  })
})
