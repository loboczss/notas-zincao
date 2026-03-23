<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Botao from '../Botao.vue'
import ModalGlobal from '../ModalGlobal.vue'
import NotasFiltro from './NotasFiltro.vue'
import type { NotasFiltroState } from './NotasFiltro.vue'
import { useNotasStore } from '../../stores'

const notasStore = useNotasStore()
const { notas, loadingNotas, errorMessage } = storeToRefs(notasStore)

const filtros = ref<NotasFiltroState>({
  nome: '',
  numero: '',
  data: '',
  valor: '',
  produto: '',
})
const fotoModalAberto = ref(false)
const fotoModalUrl = ref('')
const fotoModalTitulo = ref('Foto da nota')

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pt-BR')
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('pt-BR')
}

const notasFiltradas = computed(() => {
  const nome = filtros.value.nome.trim().toLowerCase()
  const numero = filtros.value.numero.trim().toLowerCase()
  const data = filtros.value.data.trim()
  const valor = filtros.value.valor.trim().replace(',', '.')
  const produto = filtros.value.produto.trim().toLowerCase()

  return notas.value.filter((item) => {
    const matchNome = !nome || item.nome_cliente.toLowerCase().includes(nome)
    const matchNumero = !numero || item.numero_nota.toLowerCase().includes(numero)
    const matchData = !data || item.data_compra === data

    const matchValor = !valor || (() => {
      if (item.valor_total === null) {
        return false
      }

      const raw = String(item.valor_total)
      const rawFixed = item.valor_total.toFixed(2)
      return raw.includes(valor) || rawFixed.includes(valor)
    })()

    const matchProduto = !produto || (item.produtos || []).some(prod =>
      String(prod.nome || '').toLowerCase().includes(produto),
    )

    return matchNome && matchNumero && matchData && matchValor && matchProduto
  })
})

const carregarNotas = async () => {
  await notasStore.fetchNotas()
}

const abrirFoto = (url?: string | null, titulo = 'Foto da nota') => {
  if (!url) {
    return
  }

  fotoModalUrl.value = url
  fotoModalTitulo.value = titulo
  fotoModalAberto.value = true
}

const fecharFotoModal = () => {
  fotoModalAberto.value = false
  fotoModalUrl.value = ''
}

const getStatusColor = (status: string) => {
  if (!status) return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700'
  switch (status.toLowerCase()) {
    case 'pendente': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
    case 'retirada': 
    case 'retirado': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
    case 'parcial': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
    case 'cancelado': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
    default: return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700'
  }
}

onMounted(() => {
  carregarNotas()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <Botao variant="secondary" class="w-full sm:w-auto shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700" :disabled="loadingNotas" @click="carregarNotas">
        <svg v-if="loadingNotas" class="mr-2 h-4 w-4 animate-spin inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <svg v-else class="mr-2 h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 2v6h6"/></svg>
        {{ loadingNotas ? 'Atualizando...' : 'Atualizar lista' }}
      </Botao>
    </div>

    <div class="mt-4">
      <NotasFiltro v-model="filtros" />
    </div>

    <p v-if="errorMessage" class="mt-4 text-sm font-medium text-red-600">
      {{ errorMessage }}
    </p>

    <p v-else-if="loadingNotas" class="mt-4 text-sm text-slate-600">
      Carregando notas...
    </p>

    <div v-else class="mt-4">
      <div class="space-y-3 lg:hidden">
        <article
          v-for="item in notasFiltradas"
          :key="item.id"
          class="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors duration-300 ring-1 ring-slate-100 dark:ring-slate-800"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                {{ item.nome_cliente.charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="text-base font-bold text-slate-900 dark:text-slate-100">{{ item.nome_cliente }}</p>
                <p class="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">#NF-{{ item.numero_nota || '---' }} <span class="text-slate-300 dark:text-slate-600">•</span> Série {{ item.serie_nota || '-' }}</p>
              </div>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-800">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data compra</p>
              <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-300">{{ formatDate(item.data_compra) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data retirada</p>
              <p class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-300">{{ formatDateTime(item.data_retirada) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor</p>
              <p class="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.valor_total) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Status</p>
              <span :class="['inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold leading-none', getStatusColor(item.status_retirada)]">
                {{ item.status_retirada }}
              </span>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <Botao variant="secondary" class="flex-1 sm:flex-none text-xs" :disabled="!item.foto_url" @click="abrirFoto(item.foto_url, 'Foto do cupom')">
              Cupom
            </Botao>
            <Botao variant="secondary" class="flex-1 sm:flex-none text-xs" :disabled="!item.foto_cliente_url" @click="abrirFoto(item.foto_cliente_url, 'Foto do cliente')">
              Cliente
            </Botao>
            <Botao variant="secondary" class="flex-1 sm:flex-none text-xs" :disabled="!item.comprovante_retirada_url" @click="abrirFoto(item.comprovante_retirada_url, 'Foto da retirada')">
              Retirada
            </Botao>
          </div>
        </article>

        <div v-if="notasFiltradas.length === 0" class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm">
          Nenhuma nota encontrada com os filtros informados.
        </div>
      </div>

      <div class="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 lg:block">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 dark:bg-slate-800/50">
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cliente</th>
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nº nota</th>
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Série</th>
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data compra</th>
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data retirada</th>
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor</th>
              <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th class="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fotos</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-if="notasFiltradas.length === 0">
              <td colspan="8" class="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhuma nota encontrada com os filtros informados.
              </td>
            </tr>

            <tr 
              v-for="item in notasFiltradas" 
              :key="item.id"
              class="group transition hover:bg-indigo-50/30 dark:hover:bg-slate-800/50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                    {{ item.nome_cliente.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ item.nome_cliente }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">#NF-{{ item.numero_nota || '---' }}</td>
              <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{{ item.serie_nota || '-' }}</td>
              <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{{ formatDate(item.data_compra) }}</td>
              <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{{ formatDateTime(item.data_retirada) }}</td>
              <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.valor_total) }}</td>
              <td class="px-6 py-4">
                <span :class="['inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold leading-none', getStatusColor(item.status_retirada)]">
                  {{ item.status_retirada }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-wrap justify-end gap-2">
                  <button 
                    :disabled="!item.foto_url" 
                    @click="abrirFoto(item.foto_url, 'Foto do cupom')"
                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Cupom
                  </button>
                  <button 
                    :disabled="!item.foto_cliente_url" 
                    @click="abrirFoto(item.foto_cliente_url, 'Foto do cliente')"
                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Cliente
                  </button>
                  <button 
                    :disabled="!item.comprovante_retirada_url" 
                    @click="abrirFoto(item.comprovante_retirada_url, 'Foto da retirada')"
                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Retirada
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ModalGlobal v-model="fotoModalAberto" :title="fotoModalTitulo">
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <img :src="fotoModalUrl" :alt="fotoModalTitulo" class="mx-auto max-h-[70vh] w-full rounded object-contain">
      </div>

      <template #footer>
        <div class="flex justify-end">
          <Botao variant="secondary" @click="fecharFotoModal">
            Fechar
          </Botao>
        </div>
      </template>
    </ModalGlobal>
  </div>
</template>
