<script setup lang="ts">
import { computed } from 'vue'
import RefreshIcon from '@bitrix24/b24icons-vue/outline/RefreshIcon'
import type { BootstrapResponse, DashboardFilterInput, DashboardFilters, DatePreset } from '../../types/dashboard'
import { buildCurrencyOptions, buildFilterChange, buildPeriodOptions, canApplyCustomPeriod } from './dashboardViewModel'

const props = defineProps<{
  modelValue: DashboardFilters
  currencies: BootstrapResponse['currencies']
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardFilters]
  refresh: [value: DashboardFilterInput]
}>()

const periodOptions = buildPeriodOptions()
const currencyOptions = computed(() => buildCurrencyOptions(props.currencies))
const canApply = computed(() => canApplyCustomPeriod(props.modelValue))

const update = (patch: Partial<DashboardFilters>) => {
  const result = buildFilterChange(props.modelValue, patch)
  emit('update:modelValue', result.filters)
  if (result.shouldRefresh) {
    emit('refresh', result.filters)
  }
}

const refresh = () => {
  if (canApply.value) {
    emit('refresh', props.modelValue)
  }
}
</script>

<template>
  <div class="dashboard-trend-filters">
    <B24Select
      :model-value="modelValue.preset"
      :items="periodOptions"
      :disabled="loading"
      class="dashboard-filter-control"
      aria-label="Период"
      @update:model-value="update({ preset: $event as DatePreset })"
    />
    <B24Select
      :model-value="modelValue.currency"
      :items="currencyOptions"
      :disabled="loading"
      class="dashboard-filter-control"
      aria-label="Валюта"
      @update:model-value="update({ currency: String($event) })"
    />
    <div v-if="modelValue.preset === 'custom'" class="dashboard-custom-period">
      <B24Input
        :model-value="modelValue.dateFrom"
        type="date"
        :disabled="loading"
        aria-label="Дата начала"
        @update:model-value="update({ dateFrom: String($event) })"
      />
      <B24Input
        :model-value="modelValue.dateTo"
        type="date"
        :disabled="loading"
        aria-label="Дата окончания"
        @update:model-value="update({ dateTo: String($event) })"
      />
      <B24Button color="air-secondary" :disabled="loading || !canApply" @click="refresh">
        Применить
      </B24Button>
    </div>
    <B24Tooltip text="Обновить данные">
      <B24Button
        :icon="RefreshIcon"
        color="air-tertiary"
        :loading="loading"
        :disabled="modelValue.preset === 'custom' && !canApply"
        aria-label="Обновить данные"
        @click="refresh"
      />
    </B24Tooltip>
  </div>
</template>
