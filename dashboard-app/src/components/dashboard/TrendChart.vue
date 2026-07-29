<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { VisAxis, VisGroupedBar, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { DashboardResponse } from '../../types/dashboard'
import { formatDate } from './dashboardViewModel'
import DashboardEmptyState from './DashboardEmptyState.vue'

const props = defineProps<{
  trend: DashboardResponse['trend']
  loading?: boolean
}>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)
const points = computed(() => props.trend.points)
const trendRenderKey = computed(() => points.value
  .map(point => `${point.period}:${point.createdCount}:${point.wonCount}`)
  .join('|'))
const x = (_point: DashboardResponse['trend']['points'][number], index: number) => index
const y = [
  (point: DashboardResponse['trend']['points'][number]) => point.createdCount,
  (point: DashboardResponse['trend']['points'][number]) => point.wonCount
]
const tickFormat = (index: number) => points.value[index] ? formatDate(points.value[index].period) : ''
</script>

<template>
  <B24Card ref="cardRef" class="dashboard-card dashboard-analytics-card" :class="{ 'opacity-60': loading }">
    <template #header>
      <div>
        <h2 class="dashboard-section-title">
          Динамика сделок
        </h2>
        <p class="dashboard-muted">
          Созданные и выигранные сделки по периоду
        </p>
      </div>
    </template>

    <DashboardEmptyState
      v-if="points.length === 0"
      title="Нет данных для графика"
      description="За выбранный период динамика не найдена"
      compact
    />
    <div v-else>
      <span hidden data-test="trend-point-count">{{ points.length }}</span>
      <span hidden data-test="trend-periods">{{ points.map(point => point.period).join('|') }}</span>
      <div class="dashboard-chart-legend">
        <span><i class="bg-sky-500" />Создано</span>
        <span><i class="bg-emerald-500" />Выиграно</span>
      </div>
      <VisXYContainer
        :key="trendRenderKey"
        :data="points"
        :width="width"
        class="dashboard-trend-chart"
      >
        <VisGroupedBar
          :x="x"
          :y="y"
          :color="['#0ea5e9', '#10b981']"
          :group-max-width="36"
          :data-step="1"
        />
        <VisAxis type="x" :x="x" :tick-format="tickFormat" />
        <VisAxis type="y" />
        <VisTooltip />
      </VisXYContainer>
    </div>
  </B24Card>
</template>
