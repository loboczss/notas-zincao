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

onMounted(() => {
  carregarNotas()
})
</script>

<template>
  <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6 lg:p-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <h2 class="text-xl font-semibold text-slate-900">
        Lista de notas fiscais
      </h2>

      <Botao variant="secondary" class="w-full sm:w-auto" :disabled="loadingNotas" @click="carregarNotas">
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
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-base font-semibold text-slate-900">{{ item.nome_cliente }}</p>
              <p class="mt-1 text-sm text-slate-500">Nota {{ item.numero_nota }} • Série {{ item.serie_nota }}</p>
            </div>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {{ item.status_retirada }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Data compra</p>
              <p class="mt-1 text-sm text-slate-700">{{ formatDate(item.data_compra) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Data retirada</p>
              <p class="mt-1 text-sm text-slate-700">{{ formatDateTime(item.data_retirada) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</p>
              <p class="mt-1 text-sm text-slate-700">{{ formatCurrency(item.valor_total) }}</p>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Botao variant="secondary" class="w-full sm:w-auto" :disabled="!item.foto_url" @click="abrirFoto(item.foto_url, 'Foto do cupom')">
              Cupom
            </Botao>
            <Botao variant="secondary" class="w-full sm:w-auto" :disabled="!item.foto_cliente_url" @click="abrirFoto(item.foto_cliente_url, 'Foto do cliente')">
              Cliente
            </Botao>
            <Botao variant="secondary" class="w-full sm:w-auto" :disabled="!item.comprovante_retirada_url" @click="abrirFoto(item.comprovante_retirada_url, 'Foto da retirada')">
              Foto retirada
            </Botao>
          </div>
        </article>

        <div v-if="notasFiltradas.length === 0" class="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Nenhuma nota encontrada com os filtros informados.
        </div>
      </div>

      <div class="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
        <table class="min-w-full divide-y divide-slate-200 bg-white">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nº nota</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Série</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data compra</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data retirada</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fotos</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="notasFiltradas.length === 0">
              <td colspan="8" class="px-4 py-6 text-center text-sm text-slate-500">
                Nenhuma nota encontrada com os filtros informados.
              </td>
            </tr>

            <tr v-for="item in notasFiltradas" :key="item.id">
              <td class="px-3 py-3 text-sm text-slate-700">{{ item.nome_cliente }}</td>
              <td class="px-3 py-3 text-sm text-slate-700">{{ item.numero_nota }}</td>
              <td class="px-3 py-3 text-sm text-slate-700">{{ item.serie_nota }}</td>
              <td class="px-3 py-3 text-sm text-slate-700">{{ formatDate(item.data_compra) }}</td>
              <td class="px-3 py-3 text-sm text-slate-700">{{ formatDateTime(item.data_retirada) }}</td>
              <td class="px-3 py-3 text-sm text-slate-700">{{ formatCurrency(item.valor_total) }}</td>
              <td class="px-3 py-3 text-sm text-slate-700">{{ item.status_retirada }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                  <Botao variant="secondary" :disabled="!item.foto_url" @click="abrirFoto(item.foto_url, 'Foto do cupom')">
                    Cupom
                  </Botao>
                  <Botao variant="secondary" :disabled="!item.foto_cliente_url" @click="abrirFoto(item.foto_cliente_url, 'Foto do cliente')">
                    Cliente
                  </Botao>
                  <Botao variant="secondary" :disabled="!item.comprovante_retirada_url" @click="abrirFoto(item.comprovante_retirada_url, 'Foto da retirada')">
                    Foto retirada
                  </Botao>
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
  </section>
</template>
