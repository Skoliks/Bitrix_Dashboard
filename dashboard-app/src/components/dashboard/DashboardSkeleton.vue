<template>
  <div class="dashboard-shell">
    <div class="dashboard-page-header">
      <B24Skeleton class="h-7 w-72" />
      <B24Skeleton class="h-4 w-full max-w-xl" />
    </div>
    <div class="dashboard-filter-bar">
      <B24Skeleton class="h-9 min-w-44" />
      <B24Skeleton class="h-9 min-w-44" />
      <B24Skeleton class="h-9 min-w-44" />
      <B24Skeleton class="h-9 w-10" />
    </div>
    <div class="dashboard-kpi-grid">
      <B24Skeleton v-for="index in 5" :key="index" class="h-32" />
    </div>
    <div class="dashboard-analytics-grid">
      <B24Skeleton class="h-80" />
      <B24Skeleton class="h-80" />
    </div>
    <B24Skeleton class="h-72" />
  </div>
</template>
