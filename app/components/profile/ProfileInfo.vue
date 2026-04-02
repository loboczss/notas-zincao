<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-vue-next'
import { useNotasStore } from '../../stores'

const notasStore = useNotasStore()

onMounted(async () => {
  if (!notasStore.notas.length) {
    await notasStore.fetchNotas()
  }
})

const total = computed(() => notasStore.notas.length)
const retiradas = computed(() => notasStore.notas.filter(n => n.status_retirada === 'retirada').length)
const emAberto = computed(() => notasStore.notas.filter(n => n.status_retirada === 'pendente' || n.status_retirada === 'parcial').length)
const canceladas = computed(() => notasStore.notas.filter(n => n.status_retirada === 'cancelada').length)

const stats = computed(() => [
  { label: 'Notas Totais', value: total.value, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Retiradas', value: retiradas.value, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  { label: 'Em Aberto', value: emAberto.value, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { label: 'Canceladas', value: canceladas.value, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="relative group rounded-3xl p-6 transition-all duration-300 hover:scale-105"
    >
      <!-- Glass Background -->
      <div class="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-3xl" />

      <div class="relative flex flex-col gap-4">
        <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center', stat.bg]">
          <component :is="stat.icon" :class="['w-5 h-5', stat.color]" />
        </div>

        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {{ stat.label }}
          </span>
          <span class="text-2xl font-black text-slate-900 dark:text-white">
            {{ notasStore.loadingNotas ? '–' : stat.value }}
          </span>
        </div>
      </div>

      <div class="absolute bottom-0 left-6 right-6 h-1 rounded-t-full opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-white" />
    </div>
  </div>
</template>
