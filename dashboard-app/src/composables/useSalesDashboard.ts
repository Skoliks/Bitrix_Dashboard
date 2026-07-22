import { computed, ref, shallowRef } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { createDashboardApi, type DashboardApi } from '../api/dashboardApi'
import type { BootstrapResponse, DashboardFilterInput, DashboardResponse, DashboardStatus } from '../types/dashboard'

export const createSalesDashboardState = (api: DashboardApi = createDashboardApi()) => {
  const status = ref<DashboardStatus>('initial')
  const bootstrap = shallowRef<BootstrapResponse | null>(null)
  const dashboard = shallowRef<DashboardResponse | null>(null)
  const filters = ref<DashboardFilterInput>({})
  const error = shallowRef<Error | null>(null)
  let requestId = 0

  const warnings = computed(() => dashboard.value?.warnings ?? bootstrap.value?.warnings ?? [])
  const isLoading = computed(() => status.value === 'initial' || status.value === 'loading')
  const isRefreshing = computed(() => status.value === 'refreshing')
  const isReady = computed(() => status.value === 'ready' || status.value === 'empty' || status.value === 'refreshing')

  const load = async (nextFilters: DashboardFilterInput = {}): Promise<void> => {
    const currentRequestId = ++requestId
    const hadDashboard = dashboard.value !== null
    status.value = hadDashboard ? 'refreshing' : 'loading'
    error.value = null
    filters.value = { ...filters.value, ...nextFilters }

    try {
      const loadedBootstrap = bootstrap.value ?? await api.getBootstrap()
      const loadedDashboard = await api.getDashboard(filters.value)
      if (currentRequestId !== requestId) {
        return
      }

      bootstrap.value = loadedBootstrap
      dashboard.value = loadedDashboard
      status.value = isDashboardEmpty(loadedDashboard) ? 'empty' : 'ready'
    } catch (caught) {
      if (currentRequestId !== requestId) {
        return
      }
      error.value = caught instanceof Error ? caught : new Error(String(caught))
      status.value = 'error'
    }
  }

  const refresh = async (nextFilters: DashboardFilterInput = {}): Promise<void> => {
    await load(nextFilters)
  }

  return {
    status,
    bootstrap,
    dashboard,
    filters,
    warnings,
    error,
    isLoading,
    isRefreshing,
    isReady,
    load,
    refresh
  }
}

const isDashboardEmpty = (dashboard: DashboardResponse): boolean =>
  dashboard.kpi.openNow.count === 0 &&
  dashboard.kpi.openCreated.count === 0 &&
  dashboard.kpi.won.count === 0 &&
  dashboard.stageFunnel.every(stage => stage.count === 0) &&
  dashboard.recentDeals.length === 0

export const useSalesDashboard = createSharedComposable(() => createSalesDashboardState())
