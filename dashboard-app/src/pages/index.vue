<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useSalesDashboard } from '../composables/useSalesDashboard'
import { useB24 } from '../composables/useB24'
import type { DashboardFilterInput, DashboardFilters as DashboardFiltersModel } from '../types/dashboard'
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState.vue'
import DashboardErrorState from '../components/dashboard/DashboardErrorState.vue'
import DashboardFilters from '../components/dashboard/DashboardFilters.vue'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton.vue'
import DashboardWarnings from '../components/dashboard/DashboardWarnings.vue'
import KpiCards from '../components/dashboard/KpiCards.vue'
import RecentDealsTable from '../components/dashboard/RecentDealsTable.vue'
import StageFunnel from '../components/dashboard/StageFunnel.vue'
import TrendChart from '../components/dashboard/TrendChart.vue'
import { describeFilters, type RecentDealRowView } from '../components/dashboard/dashboardViewModel'
import Market1Icon from '@bitrix24/b24icons-vue/main/Market1Icon'

const { t } = useI18n()
useHead({ title: t('page.index.seo.title') })

const salesDashboard = useSalesDashboard()
const b24Instance = useB24()

const isUseB24 = computed(() => b24Instance.isInit())
const dashboard = computed(() => salesDashboard.dashboard.value)
const activeFilters = ref<DashboardFiltersModel>({
  categoryId: 0,
  preset: 'last30',
  currency: 'all'
})

const subtitle = computed(() => dashboard.value
  ? describeFilters(dashboard.value.filters, dashboard.value.references)
  : 'Основная воронка · Последние 30 дней · Все валюты'
)
const hasDashboardData = computed(() => {
  const data = dashboard.value
  if (!data) {
    return false
  }
  return data.kpi.openNow.count > 0 ||
    data.kpi.openCreated.count > 0 ||
    data.kpi.won.count > 0 ||
    data.stageFunnel.some(stage => stage.count > 0) ||
    data.trend.points.length > 0 ||
    data.recentDeals.length > 0
})

watch(dashboard, value => {
  if (value) {
    activeFilters.value = { ...value.filters }
  }
}, { immediate: true })

const refreshDashboard = async (filters: DashboardFilterInput = activeFilters.value) => {
  await salesDashboard.refresh(filters)
}

const openDeal = (deal: RecentDealRowView) => {
  const path = deal.dealUrl ?? `/crm/deal/details/${deal.id}/`
  if (b24Instance.isInit()) {
    const frame = b24Instance.getFrame()
    void frame.slider.openPath(frame.slider.getUrl(path))
    return
  }

  if (deal.dealUrl) {
    window.open(deal.dealUrl, '_blank', 'noopener,noreferrer')
  }
}

async function initPage() {
  if (isUseB24.value) {
    b24Instance.getFrame().parent.setTitle(t('page.index.seo.title'))
  }
}

await initPage()
onMounted(() => {
  void salesDashboard.load()
})
</script>

<template>
  <B24DashboardPanel id="sales-dashboard" :b24ui="{ body: 'p-4 sm:p-5 scrollbar-transparent overflow-x-hidden' }">
    <template #header>
      <B24DashboardNavbar :title="t('page.index.seo.title')">
        <template #right>
          <B24Button
            v-if="!isUseB24"
            size="sm"
            to="/install"
            label="Install"
            color="air-boost"
            :icon="Market1Icon"
            :b24ui="{ label: 'hidden sm:block', baseLine: 'ps-[5px] pe-[5px] sm:pe-[9px]' }"
          />
        </template>
      </B24DashboardNavbar>
    </template>

    <template #body>
      <DashboardSkeleton v-if="salesDashboard.isLoading.value" />

      <div v-else class="dashboard-shell">
        <div class="dashboard-page-header">
          <div>
            <h1>Дашборд воронки продаж</h1>
            <p>{{ subtitle }}</p>
          </div>
        </div>

        <DashboardErrorState
          v-if="salesDashboard.status.value === 'error' && !dashboard"
          :description="salesDashboard.error.value?.message"
          :loading="salesDashboard.isRefreshing.value"
          @retry="refreshDashboard()"
        />

        <template v-else-if="dashboard">
          <DashboardFilters
            v-model="activeFilters"
            :references="dashboard.references"
            :loading="salesDashboard.isRefreshing.value"
            @refresh="refreshDashboard"
          />

          <DashboardErrorState
            v-if="salesDashboard.status.value === 'error'"
            title="Не удалось обновить данные"
            :description="salesDashboard.error.value?.message"
            :loading="salesDashboard.isRefreshing.value"
            @retry="refreshDashboard()"
          />

          <DashboardWarnings :warnings="dashboard.warnings" :meta="dashboard.meta" />

          <DashboardEmptyState v-if="!hasDashboardData" />

          <template v-else>
            <KpiCards
              :kpi="dashboard.kpi"
              :currencies="dashboard.references.currencies"
              :loading="salesDashboard.isRefreshing.value"
            />

            <div class="dashboard-analytics-grid">
              <StageFunnel
                :stages="dashboard.stageFunnel"
                :references="dashboard.references"
                :category-id="dashboard.filters.categoryId"
                :loading="salesDashboard.isRefreshing.value"
              />
              <TrendChart
                :trend="dashboard.trend"
                :loading="salesDashboard.isRefreshing.value"
              />
            </div>

            <RecentDealsTable
              :deals="dashboard.recentDeals"
              :references="dashboard.references"
              :loading="salesDashboard.isRefreshing.value"
              @open-deal="openDeal"
            />
          </template>
        </template>
      </div>
    </template>
  </B24DashboardPanel>
</template>
