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
const maxCount = computed(() => Math.max(1, ...rows.value.map(row => row.count)))
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
    <div v-else class="dashboard-funnel-list">
      <div v-for="row in rows" :key="row.stageId" class="dashboard-funnel-row">
        <div class="dashboard-funnel-meta">
          <span class="dashboard-funnel-name" :title="row.name">{{ row.name }}</span>
          <span class="dashboard-funnel-count">{{ row.count }}</span>
        </div>
        <div class="dashboard-funnel-track">
          <div
            class="dashboard-funnel-bar"
            :style="{ width: `${Math.max(4, (row.count / maxCount) * 100)}%`, backgroundColor: row.color || 'var(--ui-color-accent-main-primary)' }"
          />
        </div>
        <div v-if="row.money.length" class="dashboard-funnel-money">
          <span v-for="line in row.money" :key="line">{{ line }}</span>
          <span v-if="row.moneyDescription" class="dashboard-muted">{{ row.moneyDescription }}</span>
        </div>
      </div>
    </div>
  </B24Card>
</template>
