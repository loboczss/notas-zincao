<script setup lang="ts">
import { computed } from 'vue'
import { CloudUpload, FileDown, ImageDown } from 'lucide-vue-next'
import OfflineSyncProgressBar from './OfflineSyncProgressBar.vue'

const props = defineProps<{
  upload: {
    total: number
    synced: number
    failed: number
    pending: number
    currentDescription: string
  }
  download: {
    page: number
    totalPages: number
    totalCloudNotes: number
    processedNotes: number
    discoveredAssets: number
    downloadedAssets: number
    cachedAssets: number
    failedAssets: number
  }
  uploadPercent: number
  notePercent: number
  assetPercent: number
}>()

const assetDone = computed(() => {
  return props.download.downloadedAssets + props.download.cachedAssets + props.download.failedAssets
})
</script>

<template>
  <section class="grid gap-3 lg:grid-cols-3">
    <article class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-4 flex items-center gap-2">
        <CloudUpload class="h-4 w-4 text-emerald-500" />
        <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
          Envio
        </h3>
      </div>
      <OfflineSyncProgressBar
        label="Fila local"
        :value="props.uploadPercent"
        tone="emerald"
        :detail="`${props.upload.synced} enviados, ${props.upload.pending} pendentes, ${props.upload.failed} falhas`"
      />
      <p v-if="props.upload.currentDescription" class="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">
        {{ props.upload.currentDescription }}
      </p>
    </article>

    <article class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-4 flex items-center gap-2">
        <FileDown class="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
          Notas
        </h3>
      </div>
      <OfflineSyncProgressBar
        label="Download"
        :value="props.notePercent"
        :detail="`${props.download.processedNotes} de ${props.download.totalCloudNotes} notas`"
      />
      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Pagina {{ props.download.page || 0 }} de {{ props.download.totalPages || 0 }}
      </p>
    </article>

    <article class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-4 flex items-center gap-2">
        <ImageDown class="h-4 w-4 text-amber-500" />
        <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
          Imagens
        </h3>
      </div>
      <OfflineSyncProgressBar
        label="Assets"
        :value="props.assetPercent"
        tone="amber"
        :detail="`${assetDone} de ${props.download.discoveredAssets} processadas`"
      />
      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {{ props.download.downloadedAssets }} baixadas, {{ props.download.cachedAssets }} em cache, {{ props.download.failedAssets }} falhas
      </p>
    </article>
  </section>
</template>

