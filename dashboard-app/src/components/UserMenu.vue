<script setup lang="ts">
import type { B24Frame } from '@bitrix24/b24jssdk'
import type { DropdownMenuItem } from '@bitrix24/b24ui-nuxt'
import { useColorMode, useDevice, useToast } from '@bitrix24/b24ui-nuxt/composables'
import { computed } from 'vue'
import { useB24 } from '../composables/useB24'
import Expand1Icon from '@bitrix24/b24icons-vue/actions/Expand1Icon'
import PersonSettingsIcon from '@bitrix24/b24icons-vue/outline/PersonSettingsIcon'
import ScreenIcon from '@bitrix24/b24icons-vue/outline/ScreenIcon'
import SunIconAir from '@bitrix24/b24icons-vue/outline/SunIcon'
import MoonIconAir from '@bitrix24/b24icons-vue/outline/MoonIcon'
import Bitrix24Icon from '@bitrix24/b24icons-vue/common-service/Bitrix24Icon'

defineProps<{
  collapsed?: boolean
}>()

const toast = useToast()
const colorMode = useColorMode()
const b24Instance = useB24()
const { isBitrixMobile } = useDevice()

const $b24 = b24Instance.get() as B24Frame
const b24Helper = b24Instance.getHelper()

const user = computed(() => {
  const def = {
    id: 0,
    isAdmin: false,
    name: 'Bitrix24',
    avatar: { src: 'https://github.com/bitrix24.png', alt: 'Bitrix24' }
  }
  if (!isUseB24.value) {
    return def
  }

  const profile = b24Helper?.profileInfo || undefined
  if (profile) {
    return {
      id: profile.data.id!,
      isAdmin: profile.data.isAdmin,
      name: `${profile.data.name!} ${profile.data.lastName!}`.trim(),
      avatar: {
        src: profile.data.photo || '',
        alt: profile.data.name!
      }
    }
  }

  return def
})

const isUseB24 = computed<boolean>(() => {
  return b24Instance.isInit()
})

function isWeCanMakeOperationForCurrentUser(): boolean {
  if (!isUseB24.value) {
    toast.add({
      title: 'Bitrix24 jsSdk is not connected!',
      description: 'You need to open this example as a Bitrix24 application.',
      color: 'air-primary-warning',
      icon: Bitrix24Icon
    })
    return false
  } else if (isBitrixMobile.value) {
    toast.add({
      title: 'BitrixMobile detected!',
      description: 'Some Bitrix24 jsSdk features are limited in the mobile app.',
      color: 'air-primary-warning',
      icon: Bitrix24Icon
    })
    return false
  } else if (user.value.id < 1) {
    toast.add({
      title: 'Oops...',
      description: 'At this point, the user is always defined. But something went wrong.',
      color: 'air-primary-alert',
      icon: Bitrix24Icon
    })
    return false
  }

  return true
}

const items = computed<DropdownMenuItem[]>(() => [
  {
    type: 'label',
    label: user.value.name,
    avatar: user.value.avatar
  },
  {
    label: 'Профиль',
    icon: PersonSettingsIcon,
    onSelect() {
      if (isWeCanMakeOperationForCurrentUser()) {
        $b24.slider.openPath(
          $b24.slider.getUrl(`/company/personal/user/${user.value.id}/`),
          950
        )
      }
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Тема',
    children: [
      {
        label: 'Системная',
        icon: ScreenIcon,
        type: 'checkbox',
        checked: colorMode.preference === 'system',
        onSelect(e: Event) {
          e.preventDefault()
          colorMode.preference = 'system'
        }
      },
      {
        label: 'Светлая',
        icon: SunIconAir,
        type: 'checkbox',
        checked: colorMode.preference === 'light',
        onSelect(e: Event) {
          e.preventDefault()
          colorMode.preference = 'light'
        }
      },
      {
        label: 'Тёмная',
        icon: MoonIconAir,
        type: 'checkbox',
        checked: colorMode.preference === 'dark',
        onUpdateChecked(checked: boolean) {
          if (checked) {
            colorMode.preference = 'dark'
          }
        },
        onSelect(e: Event) {
          e.preventDefault()
        }
      }
    ]
  }
])
</script>

<template>
  <B24DropdownMenu
    :items="items"
    :content="{ align: 'start', side: 'top', sideOffset: -6, collisionPadding: 12 }"
    :b24ui="{ content: 'w-[200px]', viewport: 'w-[200px] max-h-[62vh]' }"
  >
    <B24Button
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name
      }"
      color="air-tertiary"
      block
      class="data-[state=open]:bg-(--ui-btn-background-hover)"
      :class="[!collapsed && 'py-2']"
      :b24ui="{ label: 'flex-1' }"
    >
      <template v-if="!collapsed" #trailing>
        <Expand1Icon class="size-4" />
      </template>
    </B24Button>
  </B24DropdownMenu>
</template>
