<script setup lang="ts">
import { computed, type Component } from 'vue'
import { CheckCircle2, FileText, ImageOff, Loader2, Trash2 } from 'lucide-vue-next'
import type { OfflineNotaSyncNoteProgress } from '../../composables/useOfflineNotasSync'

const props = defineProps<{
  notes: OfflineNotaSyncNoteProgress[]
  running?: boolean
}>()

const statusIcon = (status: OfflineNotaSyncNoteProgress['status']): Component => {
  if (status === 'saved') return CheckCircle2
  if (status === 'deleted') return Trash2
  if (status === 'failed') return ImageOff
  if (status === 'saving') return Loader2
  return FileText
}

const statusClass = (status: OfflineNotaSyncNoteProgress['status']) => {
  if (status === 'saved') return 'text-emerald-500'
  if (status === 'deleted') return 'text-slate-500'
  if (status === 'failed') return 'text-rose-500'
  if (status === 'saving') return 'text-brand-600 dark:text-brand-400'
  return 'text-slate-400'
}

const visibleNotes = computed(() => props.notes.slice(0, 12))
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div>
        <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">
          Progresso por nota
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Ultimas {{ visibleNotes.length }} notas processadas.
        </p>
      </div>
      <Loader2 v-if="props.running" class="h-4 w-4 animate-spin text-brand-600" />
    </div>

    <div v-if="!visibleNotes.length" class="flex min-h-32 items-center justify-center p-6 text-center">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Nenhuma nota processada nesta execucao.
      </p>
    </div>

    <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <article
        v-for="note in visibleNotes"
        :key="note.id"
        class="flex items-start gap-3 px-4 py-3"
      >
        <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
          <component
            :is="statusIcon(note.status)"
            class="h-4 w-4"
            :class="[statusClass(note.status), { 'animate-spin': note.status === 'saving' }]"
          />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ note.label }}
            </p>
            <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ note.assetsProcessed }}/{{ note.assetCount }} imagens
            </span>
          </div>

          <p v-if="note.lastAssetLabel" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ note.lastAssetLabel }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>
