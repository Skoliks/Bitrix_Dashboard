<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardResponse } from '../../types/dashboard'
import { buildWarningMessages } from './dashboardViewModel'
import AlertIcon from '@bitrix24/b24icons-vue/outline/AlertIcon'

const props = defineProps<{
  warnings: DashboardResponse['warnings']
  meta?: DashboardResponse['meta']
}>()

const items = computed(() => buildWarningMessages(props.warnings, props.meta))
</script>

<template>
  <div v-if="items.length" class="dashboard-warning-list" role="status">
    <B24Alert
      v-for="warning in items"
      :key="warning.code"
      color="air-warning"
      :icon="AlertIcon"
      :title="warning.title"
      :description="warning.description"
    />
  </div>
</template>
