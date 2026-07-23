<script setup lang="ts">
import { computed } from 'vue'
import type { BootstrapResponse, DashboardFilterInput, DashboardFilters, DatePreset } from '../../types/dashboard'
import { buildCategoryOptions, buildCurrencyOptions, buildPeriodOptions } from './dashboardViewModel'
import RefreshIcon from '@bitrix24/b24icons-vue/outline/RefreshIcon'

const props = defineProps<{
  modelValue: DashboardFilters
  references: Pick<BootstrapResponse, 'categories' | 'currencies'>
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardFilters]
  refresh: [value: DashboardFilterInput]
}>()

const categoryOptions = computed(() => buildCategoryOptions(props.references.categories))
const periodOptions = buildPeriodOptions()
const currencyOptions = computed(() => buildCurrencyOptions(props.references.currencies))

const update = (patch: Partial<DashboardFilters>) => {
  const next = { ...props.modelValue, ...patch }
  emit('update:modelValue', next)
}

const refresh = () => {
  emit('refresh', props.modelValue)
}
</script>

<template>
  <div class="dashboard-filter-bar">
    <B24Select
      :model-value="modelValue.categoryId"
      :items="categoryOptions"
      :disabled="loading || categoryOptions.length === 0"
      class="dashboard-filter-control"
      aria-label="Воронка"
      @update:model-value="value => update({ categoryId: Number(value) })"
    />
    <B24Select
      :model-value="modelValue.preset"
      :items="periodOptions"
      :disabled="loading"
      class="dashboard-filter-control"
      aria-label="Период"
      @update:model-value="value => update({ preset: value as DatePreset })"
    />
    <B24Select
      :model-value="modelValue.currency"
      :items="currencyOptions"
      :disabled="loading"
      class="dashboard-filter-control"
      aria-label="Валюта"
      @update:model-value="value => update({ currency: String(value) })"
    />
    <div v-if="modelValue.preset === 'custom'" class="dashboard-custom-period">
      <B24Input
        :model-value="modelValue.dateFrom"
        type="date"
        :disabled="loading"
        aria-label="Дата начала"
        @update:model-value="value => update({ dateFrom: String(value) })"
      />
      <B24Input
        :model-value="modelValue.dateTo"
        type="date"
        :disabled="loading"
        aria-label="Дата окончания"
        @update:model-value="value => update({ dateTo: String(value) })"
      />
    </div>
    <B24Tooltip text="Обновить данные">
      <B24Button
        :icon="RefreshIcon"
        color="air-primary"
        :loading="loading"
        aria-label="Обновить данные"
        @click="refresh"
      />
    </B24Tooltip>
  </div>
</template>
