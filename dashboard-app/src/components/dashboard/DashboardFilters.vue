<script setup lang="ts">
import { computed } from 'vue'
import type { BootstrapResponse, DashboardFilterInput, DashboardFilters, DatePreset } from '../../types/dashboard'
import {
  buildCategoryOptions,
  buildCurrencyOptions,
  buildFilterChange,
  buildPeriodOptions,
  canApplyCustomPeriod
} from './dashboardViewModel'
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

const updateCategory = (value: unknown) => update({ categoryId: Number(value) })
const updatePreset = (value: unknown) => update({ preset: value as DatePreset })
const updateCurrency = (value: unknown) => update({ currency: String(value) })
const updateDateFrom = (value: unknown) => update({ dateFrom: String(value) })
const updateDateTo = (value: unknown) => update({ dateTo: String(value) })
</script>

<template>
  <div class="dashboard-filter-bar">
    <B24Select
      :model-value="modelValue.categoryId"
      :items="categoryOptions"
      :disabled="loading || categoryOptions.length === 0"
      class="dashboard-filter-control"
      aria-label="Воронка"
      @update:model-value="updateCategory"
    />
    <B24Select
      :model-value="modelValue.preset"
      :items="periodOptions"
      :disabled="loading"
      class="dashboard-filter-control"
      aria-label="Период"
      @update:model-value="updatePreset"
    />
    <B24Select
      :model-value="modelValue.currency"
      :items="currencyOptions"
      :disabled="loading"
      class="dashboard-filter-control"
      aria-label="Валюта"
      @update:model-value="updateCurrency"
    />
    <div v-if="modelValue.preset === 'custom'" class="dashboard-custom-period">
      <B24Input
        :model-value="modelValue.dateFrom"
        type="date"
        :disabled="loading"
        aria-label="Дата начала"
        @update:model-value="updateDateFrom"
      />
      <B24Input
        :model-value="modelValue.dateTo"
        type="date"
        :disabled="loading"
        aria-label="Дата окончания"
        @update:model-value="updateDateTo"
      />
      <B24Button
        color="air-secondary"
        :disabled="loading || !canApply"
        @click="refresh"
      >
        Применить
      </B24Button>
    </div>
    <B24Tooltip text="Обновить данные">
      <B24Button
        :icon="RefreshIcon"
        color="air-primary"
        :loading="loading"
        :disabled="modelValue.preset === 'custom' && !canApply"
        aria-label="Обновить данные"
        @click="refresh"
      />
    </B24Tooltip>
  </div>
</template>
