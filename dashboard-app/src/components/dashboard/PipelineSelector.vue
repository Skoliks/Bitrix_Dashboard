<script setup lang="ts">
import { computed } from 'vue'
import RefreshIcon from '@bitrix24/b24icons-vue/outline/RefreshIcon'
import type { BootstrapResponse, DashboardFilterInput, DashboardFilters } from '../../types/dashboard'
import { buildCategoryOptions, buildFilterChange } from './dashboardViewModel'

const props = defineProps<{
  modelValue: DashboardFilters
  references: Pick<BootstrapResponse, 'categories'>
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardFilters]
  refresh: [value: DashboardFilterInput]
}>()

const categoryOptions = computed(() => buildCategoryOptions(props.references.categories))

const updateCategory = (value: unknown) => {
  const result = buildFilterChange(props.modelValue, { categoryId: Number(value) })
  emit('update:modelValue', result.filters)
  if (result.shouldRefresh) {
    emit('refresh', result.filters)
  }
}
</script>

<template>
  <div class="dashboard-pipeline-selector">
    <B24Select
      :model-value="modelValue.categoryId"
      :items="categoryOptions"
      :disabled="loading || categoryOptions.length === 0"
      class="dashboard-filter-control"
      aria-label="Воронка"
      @update:model-value="updateCategory"
    />
    <B24Tooltip text="Обновить данные">
      <B24Button
        :icon="RefreshIcon"
        color="air-primary"
        :loading="loading"
        aria-label="Обновить данные"
        @click="emit('refresh', modelValue)"
      />
    </B24Tooltip>
  </div>
</template>
