<script setup lang="ts">
import type { Ref } from 'vue'
import { inject, ref } from 'vue'

const isLoading = inject<Ref<boolean>>('isLoading', ref(false))
</script>

<template>
  <div v-if="isLoading" class="min-h-dvh" />
  <B24DashboardGroup
    v-else
    unit="px"
    storage="local"
    aria-label="Дашборд"
  >
    <RouterView />
  </B24DashboardGroup>
</template>
