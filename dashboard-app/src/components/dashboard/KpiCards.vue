<script setup lang="ts">
import { computed } from 'vue'
import type { BootstrapResponse, DashboardResponse } from '../../types/dashboard'
import { buildKpiCards } from './dashboardViewModel'

const props = defineProps<{
  kpi: DashboardResponse['kpi']
  currencies: BootstrapResponse['currencies']
  loading?: boolean
}>()

const cards = computed(() => buildKpiCards(props.kpi, props.currencies))
</script>

<template>
  <div class="dashboard-kpi-grid" :class="{ 'opacity-60': loading }">
    <B24Card v-for="card in cards" :key="card.key" class="dashboard-card">
      <div class="dashboard-card-heading">
        {{ card.title }}
      </div>
      <div class="dashboard-kpi-value">
        {{ card.value }}
      </div>
      <div v-if="card.money && card.money.length > 1" class="dashboard-money-list">
        <span v-for="line in card.money.slice(1)" :key="line">{{ line }}</span>
      </div>
      <p class="dashboard-muted">
        {{ card.description }}
      </p>
    </B24Card>
  </div>
</template>
