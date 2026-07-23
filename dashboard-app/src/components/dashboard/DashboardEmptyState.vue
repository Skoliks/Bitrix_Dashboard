<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  compact?: boolean
}>()
</script>

<template>
  <div class="dashboard-state" :class="{ 'dashboard-state-compact': compact }">
    <h2>{{ title ?? 'Нет сделок за выбранный период' }}</h2>
    <p>{{ description ?? 'Измените период, валюту или воронку, чтобы проверить другие данные.' }}</p>
  </div>
</template>
