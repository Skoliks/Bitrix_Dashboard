<script setup lang="ts">
import type { DropdownMenuItem } from '@bitrix24/b24ui-nuxt'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useSalesDashboard } from '../composables/useSalesDashboard'
import { useDashboard } from '../composables/useDashboard'
import { useB24 } from '../composables/useB24'
import type { DashboardWarning } from '../types/dashboard'
import Bell1Icon from '@bitrix24/b24icons-vue/main/Bell1Icon'
import PlusLIcon from '@bitrix24/b24icons-vue/outline/PlusLIcon'
import SendIcon from '@bitrix24/b24icons-vue/outline/SendIcon'
import AddPersonIcon from '@bitrix24/b24icons-vue/outline/AddPersonIcon'
import DatabaseIcon from '@bitrix24/b24icons-vue/outline/DatabaseIcon'
import Market1Icon from '@bitrix24/b24icons-vue/main/Market1Icon'

const { t } = useI18n()
useHead({ title: t('page.index.seo.title') })
const salesDashboard = useSalesDashboard()

const { isBitrixMobile } = useDevice()
const { isNotificationsSlideoverOpen } = useDashboard()
const b24Instance = useB24()

const isUseB24 = computed<boolean>(() => {
  return b24Instance.isInit()
})
const dashboard = computed(() => salesDashboard.dashboard.value)
const warningTitleByCode: Record<DashboardWarning['code'], string> = {
  USERS_UNAVAILABLE: 'Users are temporarily unavailable',
  INCOMPLETE_FINANCIAL_DATA: 'Some deal amounts are incomplete',
  UNKNOWN_STAGE_SEMANTICS: 'Some stage semantics are unknown',
  PARTIAL_AGGREGATION: 'Dashboard data is partially aggregated'
}
const warnings = computed(() => salesDashboard.warnings.value.map(warning => ({
  ...warning,
  title: warningTitleByCode[warning.code]
})))

const addButton = ref({
  isOnlyBitrixMobile: false,
  items: [
    {
      label: 'New mail',
      icon: SendIcon,
      to: '/inbox'
    },
    {
      label: 'New customer',
      icon: AddPersonIcon,
      to: '/customers'
    }
  ] satisfies DropdownMenuItem[]
})

async function initPage() {
  if (!isUseB24.value) {
    return
  }

  /**
   * @memo Tracking locale via watch is not required, since in the Bitrix24 interface, changing the language initiates a full page reload.
   */
  b24Instance.getFrame().parent.setTitle(t('page.index.seo.title'))
}

await initPage()
onMounted(() => {
  void salesDashboard.load()
})
</script>

<template>
  <B24DashboardPanel id="home" :b24ui="{ body: 'p-4 sm:pt-4 scrollbar-transparent' }">
    <template #header>
      <B24DashboardNavbar :title="t('page.index.seo.title')">
        <template #right>
          <B24Button
            v-if="!isUseB24"
            size="sm"
            to="/install"
            label="Install"
            color="air-boost"
            :icon="Market1Icon"
            :b24ui="{ label: 'hidden sm:block', baseLine: 'ps-[5px] pe-[5px] sm:pe-[9px]' }"
          />
          <B24Button
            size="sm"
            label="Feedback"
          />
          <B24Tooltip text="Notifications" :kbds="['N']">
            <B24Button
              size="sm"
              class="me-1"
              color="air-tertiary-no-accent"
              :b24ui="{ baseLine: 'ps-[2px] pe-[2px]' }"
              @click="isNotificationsSlideoverOpen = true"
            >
              <B24Chip inset color="air-primary-alert">
                <Bell1Icon class="size-7 shrink-0" />
              </B24Chip>
            </B24Button>
          </B24Tooltip>
        </template>
      </B24DashboardNavbar>

      <B24DashboardToolbar class="scrollbar-thin scrollbar-transparent">
        <template #left>
          <B24Button
            :icon="DatabaseIcon"
            label="Refresh"
            color="air-secondary"
            loading-auto
            @click="() => salesDashboard.refresh()"
          />
        </template>
      </B24DashboardToolbar>
    </template>

    <template #body>
      <B24DropdownMenu
        v-if="!addButton.isOnlyBitrixMobile || (addButton.isOnlyBitrixMobile && isBitrixMobile)"
        :items="addButton.items"
        :content="{ align: 'end' }"
      >
        <B24Button
          :icon="PlusLIcon"
          size="xl"
          color="air-primary"
          class="fixed bottom-[13.5px] right-[24px] rounded-[18px] z-10 opacity-70 py-[29px] ps-[25px] pe-[33px] [--ui-btn-icon-size:32px]"
        />
      </B24DropdownMenu>
      <section class="grid gap-4">
        <B24Alert
          v-if="salesDashboard.status.value === 'error'"
          color="air-primary-alert"
          title="Dashboard is unavailable"
          :description="salesDashboard.error.value?.message"
        />
        <B24Alert
          v-for="warning in warnings"
          :key="warning.code"
          color="air-warning"
          :title="warning.title"
        />
        <div class="grid gap-3 sm:grid-cols-3">
          <B24Card>
            <div class="text-sm text-muted">
              Open deals
            </div>
            <div class="text-2xl font-semibold">
              {{ dashboard?.kpi.openNow.count ?? 0 }}
            </div>
          </B24Card>
          <B24Card>
            <div class="text-sm text-muted">
              Created deals
            </div>
            <div class="text-2xl font-semibold">
              {{ dashboard?.kpi.openCreated.count ?? 0 }}
            </div>
          </B24Card>
          <B24Card>
            <div class="text-sm text-muted">
              Won deals
            </div>
            <div class="text-2xl font-semibold">
              {{ dashboard?.kpi.won.count ?? 0 }}
            </div>
          </B24Card>
        </div>
      </section>
      <template v-if="salesDashboard.isLoading.value">
        <HomeLoaderChart class="min-h-[470px]" />
        <HomeLoaderSales class="min-h-[230px]" />
      </template>
      <template v-else>
        <section class="grid gap-4 mt-4">
          <B24Card>
            <div class="text-sm text-muted">
              Sales funnel
            </div>
            <div class="grid gap-2 mt-3">
              <div
                v-for="stage in dashboard?.stageFunnel ?? []"
                :key="stage.stageId"
                class="flex items-center justify-between gap-3"
              >
                <span>{{ stage.name }}</span>
                <span class="font-medium">{{ stage.count }}</span>
              </div>
            </div>
          </B24Card>
          <B24Card>
            <div class="text-sm text-muted">
              Recent deals
            </div>
            <div class="grid gap-2 mt-3">
              <div
                v-for="deal in dashboard?.recentDeals ?? []"
                :key="deal.id"
                class="flex items-center justify-between gap-3"
              >
                <span>{{ deal.title }}</span>
                <span class="font-medium">{{ deal.amount }} {{ deal.currency ?? '' }}</span>
              </div>
            </div>
          </B24Card>
        </section>
      </template>
    </template>
  </B24DashboardPanel>
</template>
