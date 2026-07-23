<script setup lang="ts">
import type { NavigationMenuItem, CommandPaletteGroup, CommandPaletteItem } from '@bitrix24/b24ui-nuxt'
import type { Ref } from 'vue'
import { computed, ref, inject } from 'vue'
import HomeIcon from '@bitrix24/b24icons-vue/outline/HomeIcon'
import HamburgerMenuIcon from '@bitrix24/b24icons-vue/outline/HamburgerMenuIcon'

const open = ref(false)
const isLoading = inject<Ref<boolean>>('isLoading', ref(false))

const links = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Дашборд',
      icon: HomeIcon,
      to: '/',
      onSelect: () => {
        open.value = false
      }
    }
  ]
])

const groups = computed<CommandPaletteGroup[]>(() => [
  {
    id: 'links',
    label: 'Навигация',
    items: links.value.flat() as CommandPaletteItem[]
  }
])

</script>

<template>
  <div v-if="isLoading" class="min-h-dvh" />
  <B24DashboardGroup
    v-else
    unit="px"
    storage="local"
  >
    <B24DashboardSidebar
      id="default"
      v-model:open="open"
      mode="slideover"
      collapsible
      resizable
      class="border-e-1"
    >
      <template #header="{ collapsed }">
        <B24DashboardSidebarCollapse :icon="HamburgerMenuIcon" class="size-9 px-2" />
        <AppTitle v-show="!collapsed" />
      </template>

      <template #default="{ collapsed }">
        <B24DashboardSearchButton
          :collapsed="collapsed"
          class="opacity-70 hover:opacity-100"
        />

        <B24NavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu class="mb-2" :collapsed="collapsed" />
      </template>
    </B24DashboardSidebar>

    <B24DashboardSearch :groups="groups" :color-mode="false" />

    <RouterView />
  </B24DashboardGroup>
</template>
