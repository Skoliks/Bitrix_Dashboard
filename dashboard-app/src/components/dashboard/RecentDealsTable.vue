<script setup lang="ts">
import type { TableColumn } from '@bitrix24/b24ui-nuxt'
import { computed, h, resolveComponent } from 'vue'
import type { BootstrapResponse, DashboardResponse } from '../../types/dashboard'
import { buildRecentDealRows, type RecentDealRowView } from './dashboardViewModel'
import LinkIcon from '@bitrix24/b24icons-vue/outline/LinkIcon'
import DashboardEmptyState from './DashboardEmptyState.vue'

const props = defineProps<{
  deals: DashboardResponse['recentDeals']
  references: Pick<BootstrapResponse, 'users' | 'currencies' | 'stages'>
  loading?: boolean
}>()

const emit = defineEmits<{
  openDeal: [deal: RecentDealRowView]
}>()

const B24Button = resolveComponent('B24Button')
const rows = computed(() => buildRecentDealRows(props.deals, props.references.users, props.references.currencies, props.references.stages))

const columns: TableColumn<RecentDealRowView>[] = [
  {
    accessorKey: 'title',
    header: 'Сделка',
    cell: ({ row }) => h('button', {
      class: 'dashboard-table-link',
      type: 'button',
      title: row.original.title,
      onClick: () => emit('openDeal', row.original)
    }, row.original.title)
  },
  { accessorKey: 'amountLabel', header: 'Сумма' },
  { accessorKey: 'stageLabel', header: 'Стадия' },
  { accessorKey: 'assignedLabel', header: 'Ответственный' },
  { accessorKey: 'createdAtLabel', header: 'Создана' },
  {
    id: 'open',
    header: '',
    cell: ({ row }) => h(B24Button, {
      icon: LinkIcon,
      size: 'xs',
      color: 'air-tertiary-no-accent',
      'aria-label': `Открыть сделку ${row.original.id}`,
      onClick: () => emit('openDeal', row.original)
    })
  }
]
</script>

<template>
  <B24Card class="dashboard-card">
    <template #header>
      <div>
        <h2 class="dashboard-section-title">
          Последние созданные сделки
        </h2>
        <p class="dashboard-muted">
          Новые сделки по выбранным фильтрам
        </p>
      </div>
    </template>

    <DashboardEmptyState
      v-if="!loading && rows.length === 0"
      title="Последних созданных сделок нет"
      description="За выбранный период в этой воронке не найдено созданных сделок"
      compact
    />
    <div v-else class="dashboard-table-scroll">
      <B24Table
        :loading="loading"
        loading-animation="swing"
        :data="rows"
        :columns="columns"
        class="min-w-[760px]"
      />
    </div>
  </B24Card>
</template>
