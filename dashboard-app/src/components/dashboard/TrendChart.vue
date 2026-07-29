<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { VisArea, VisAxis, VisLine, VisLineSelectors, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { BootstrapResponse, DashboardFilterInput, DashboardFilters, DashboardResponse } from '../../types/dashboard'
import { formatDate, formatMoneyList } from './dashboardViewModel'
import DashboardEmptyState from './DashboardEmptyState.vue'
import TrendFilters from './TrendFilters.vue'
import { buildTrendLayout, buildTrendSeries, shouldShowTrendLabel, type TrendSeries } from './trendViewModel'

const props = defineProps<{
  trend: DashboardResponse['trend']
  filters: DashboardFilters
  currencies: BootstrapResponse['currencies']
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:filters': [value: DashboardFilters]
  refresh: [value: DashboardFilterInput]
}>()

const selectedSeries = ref<TrendSeries>('created')
const viewportRef = useTemplateRef<HTMLElement | null>('viewportRef')
const { width: viewportWidth } = useElementSize(viewportRef)
const points = computed(() => buildTrendSeries(props.trend, selectedSeries.value))
const trendLayout = computed(() => buildTrendLayout(points.value.length, viewportWidth.value))
const seriesColor = computed(() => selectedSeries.value === 'created' ? '#0ea5e9' : '#10b981')
const trendRenderKey = computed(() => `${selectedSeries.value}:${points.value.map(point => `${point.period}:${point.count}`).join('|')}`)
const x = (_point: typeof points.value[number], index: number) => index
const y = (point: typeof points.value[number]) => point.count
const tickFormat = (index: number) => {
  if (!shouldShowTrendLabel(index, points.value.length, trendLayout.value.labelEvery)) {
    return ''
  }
  return points.value[index] ? formatDate(points.value[index].period) : ''
}
const yTickFormat = (value: number) => String(Math.max(0, value))

const buildTooltip = (datum: unknown) => {
  const point = (Array.isArray(datum) ? datum[0] : datum) as typeof points.value[number] | undefined
  if (!point || typeof point.period !== 'string') {
    return undefined
  }

  const root = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = formatDate(point.period)
  const count = document.createElement('div')
  count.textContent = `Количество: ${point.count}`
  root.append(title, count)

  if (selectedSeries.value === 'won') {
    for (const money of formatMoneyList(point.wonAmountsByCurrency, props.currencies)) {
      const line = document.createElement('div')
      line.textContent = money
      root.append(line)
    }
  }

  return root
}

const tooltipTriggers = computed(() => ({
  [VisLineSelectors.line]: buildTooltip
}))
</script>

<template>
  <B24Card class="dashboard-card dashboard-analytics-card dashboard-trend-card" :class="{ 'opacity-60': loading }">
    <template #header>
      <div class="dashboard-trend-header">
        <div>
          <h2 class="dashboard-section-title">
            Динамика сделок
          </h2>
          <p class="dashboard-muted">
            Изменение выбранного показателя за период
          </p>
        </div>
        <TrendFilters
          :model-value="filters"
          :currencies="currencies"
          :loading="loading"
          @update:model-value="emit('update:filters', $event)"
          @refresh="emit('refresh', $event)"
        />
      </div>
    </template>

    <DashboardEmptyState
      v-if="points.length === 0"
      title="Нет данных для графика"
      description="За выбранный период динамика не найдена"
      compact
    />
    <div v-else class="dashboard-trend-content">
      <span hidden data-test="trend-point-count">{{ points.length }}</span>
      <span hidden data-test="trend-periods">{{ points.map(point => point.period).join('|') }}</span>
      <div class="dashboard-trend-series" role="group" aria-label="Показатель графика">
        <B24Button
          size="sm"
          :color="selectedSeries === 'created' ? 'air-primary' : 'air-tertiary'"
          :aria-pressed="selectedSeries === 'created'"
          @click="selectedSeries = 'created'"
        >
          Создано
        </B24Button>
        <B24Button
          size="sm"
          :color="selectedSeries === 'won' ? 'air-primary' : 'air-tertiary'"
          :aria-pressed="selectedSeries === 'won'"
          @click="selectedSeries = 'won'"
        >
          Выиграно
        </B24Button>
      </div>
      <div ref="viewportRef" data-test="trend-viewport" class="dashboard-trend-viewport">
        <VisXYContainer
          :key="trendRenderKey"
          :data="points"
          :width="Math.max(1, trendLayout.width)"
          class="dashboard-trend-chart"
        >
          <VisArea :x="x" :y="y" :color="seriesColor" />
          <VisLine :x="x" :y="y" :color="seriesColor" :line-width="3" />
          <VisAxis type="x" :x="x" :tick-format="tickFormat" />
          <VisAxis type="y" :y="y" :tick-format="yTickFormat" />
          <VisTooltip :triggers="tooltipTriggers" />
        </VisXYContainer>
      </div>
    </div>
  </B24Card>
</template>
