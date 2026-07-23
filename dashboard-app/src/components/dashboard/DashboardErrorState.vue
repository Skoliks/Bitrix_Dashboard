<script setup lang="ts">
import RefreshIcon from '@bitrix24/b24icons-vue/outline/RefreshIcon'

defineProps<{
  title?: string
  description?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <B24Card class="dashboard-card">
    <div class="dashboard-state">
      <h2>{{ title ?? 'Дашборд недоступен' }}</h2>
      <p>{{ description ?? 'Не удалось загрузить данные. Повторите запрос или проверьте доступ к CRM.' }}</p>
      <B24Button
        :icon="RefreshIcon"
        color="air-primary"
        :loading="loading"
        @click="emit('retry')"
      >
        Повторить
      </B24Button>
    </div>
  </B24Card>
</template>
