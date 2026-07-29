<script setup lang="ts">
import { computed } from 'vue'
import type { BootstrapResponse, DashboardResponse } from '../../types/dashboard'
import { buildStageRows } from './dashboardViewModel'
import DashboardEmptyState from './DashboardEmptyState.vue'

const props = defineProps<{
  stages: DashboardResponse['stageFunnel']
  references: Pick<BootstrapResponse, 'stages' | 'currencies'>
  categoryId: number
  meta?: DashboardResponse['meta']
  loading?: boolean
}>()

const rows = computed(() => buildStageRows(props.stages, props.references.stages, props.references.currencies, props.categoryId, props.meta))
const layerWidth = (index: number, total: number) => `${Math.max(60, 100 - (index * 40) / Math.max(1, total - 1))}%`
</script>

<template>
  <B24Card class="dashboard-card dashboard-analytics-card" :class="{ 'opacity-60': loading }">
    <template #header>
      <div>
        <h2 class="dashboard-section-title">
          Воронка по стадиям
        </h2>
        <p class="dashboard-muted">
          Все стадии выбранной воронки, включая нулевые
        </p>
      </div>
    </template>

    <DashboardEmptyState
      v-if="rows.length === 0"
      title="Не удалось показать стадии воронки"
      description="Справочник стадий недоступен для выбранной воронки"
      compact
    />
    <div v-else class="dashboard-funnel" aria-label="Воронка по стадиям">
      <div
        v-for="(row, index) in rows"
        :key="row.stageId"
        data-test="funnel-layer"
        class="dashboard-funnel-layer"
        :style="{ width: layerWidth(index, rows.length), backgroundColor: row.color || 'var(--ui-color-accent-main-primary)' }"
        :aria-label="`${row.name}: ${row.count}`"
      >
        <div data-test="funnel-layer-content" class="dashboard-funnel-layer-content">
          <span class="dashboard-funnel-name" :title="row.name">{{ row.name }}</span>
          <span class="dashboard-funnel-count">{{ row.count }}</span>
        </div>
        <span v-if="row.money.length" class="dashboard-funnel-money">
          <span v-for="line in row.money" :key="line">{{ line }}</span>
        </span>
        <span v-if="row.moneyDescription" class="dashboard-funnel-description">{{ row.moneyDescription }}</span>
      </div>
    </div>
  </B24Card>
</template>
