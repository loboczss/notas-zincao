<script setup lang="ts">
import { Cloud, RefreshCw, WifiOff } from 'lucide-vue-next'
import { useOfflineStatus } from '../composables/useOfflineStatus'
import { AppRoute } from '../constants/routes'

const offline = useOfflineStatus()
const isOnline = offline.isOnline
const pendingCount = offline.pendingCount
const pendingNotasCount = offline.pendingNotasCount
const syncing = offline.syncing
</script>

<template>
  <div
    v-if="!isOnline || pendingCount > 0"
    class="fixed bottom-24 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur-md md:bottom-4"
    :class="[
      isOnline
        ? 'border-amber-200 bg-amber-50/95 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/95 dark:text-amber-100'
        : 'border-slate-300 bg-slate-950/95 text-white dark:border-slate-700'
    ]"
  >
    <NuxtLink :to="AppRoute.sincronizacao" class="flex min-w-0 items-center gap-2">
      <WifiOff v-if="!isOnline" class="h-4 w-4 shrink-0" />
      <Cloud v-else class="h-4 w-4 shrink-0" />

      <span class="font-medium">
        <template v-if="!isOnline">Offline</template>
        <template v-else>Sincronizacao pendente</template>
      </span>

      <span v-if="pendingNotasCount > 0" class="rounded bg-black/10 px-1.5 py-0.5 dark:bg-white/10">
        {{ pendingNotasCount }} notas
      </span>
      <span v-else-if="pendingCount > 0" class="rounded bg-black/10 px-1.5 py-0.5 dark:bg-white/10">
        {{ pendingCount }}
      </span>
    </NuxtLink>

    <button
      v-if="isOnline"
      type="button"
      class="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-black/10 disabled:opacity-50 dark:hover:bg-white/10"
      :disabled="syncing"
      aria-label="Sincronizar agora"
      @click="offline.syncNow"
    >
      <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': syncing }" />
    </button>
  </div>
</template>
