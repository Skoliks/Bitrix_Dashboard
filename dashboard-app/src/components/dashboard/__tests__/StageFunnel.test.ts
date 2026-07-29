/* eslint-disable vue/one-component-per-file */
import { createApp, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import type { BootstrapResponse, DashboardResponse } from '../../../types/dashboard'
import StageFunnel from '../StageFunnel.vue'

const references: Pick<BootstrapResponse, 'stages' | 'currencies'> = {
  stages: [
    { id: 'NEW', entityId: 'DEAL_STAGE', name: 'New', sort: 10, semantic: 'process', categoryId: 0 },
    { id: 'PROPOSAL', entityId: 'DEAL_STAGE', name: 'Proposal', sort: 20, semantic: 'process', categoryId: 0 },
    { id: 'WON', entityId: 'DEAL_STAGE', name: 'Won', sort: 30, semantic: 'success', categoryId: 0 }
  ],
  currencies: [{ id: 'RUB', amountCnt: 1, amount: 1, sort: 100, base: true, fullName: 'Ruble', formatString: '# ₽', decimals: 2 }]
}

const stages: DashboardResponse['stageFunnel'] = [
  { stageId: 'NEW', name: 'New', sort: 10, semantic: 'process', count: 4, share: 0.8, amountsByCurrency: [{ currency: 'RUB', amount: 120000 }] },
  { stageId: 'WON', name: 'Won', sort: 30, semantic: 'success', count: 1, share: 0.2, amountsByCurrency: [{ currency: 'RUB', amount: 900 }] }
]

const mountedApps: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const { unmount, host } of mountedApps.splice(0)) {
    unmount()
    host.remove()
  }
})

describe('StageFunnel', () => {
  it('renders each stage as a visual funnel layer, including an empty stage', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () => h(StageFunnel, { stages, references, categoryId: 0 })
    })
    app.component('B24Card', {
      template: '<section><slot name="header" /><slot /></section>'
    })
    app.mount(host)
    mountedApps.push({ unmount: () => app.unmount(), host })

    expect(host.querySelectorAll('[data-test="funnel-layer"]')).toHaveLength(3)
    expect(host.querySelectorAll('[data-test="funnel-layer-content"]')).toHaveLength(3)
    expect(host.textContent).toContain('Proposal')
    expect(host.textContent).toContain('0')
  })
})
