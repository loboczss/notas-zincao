<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePrevisaoComprasStore } from '../../stores'
import { getApiFetch } from '../../utils/api-fetch'
import { getApiErrorMessage } from '../../utils/api-errors'
import type {
  IntegrimCompraAiOportunidade,
  IntegrimCompraOportunidadeStatus,
  IntegrimListaCompraQuery,
  IntegrimListaCompraRow,
} from '../../../shared/types/IntegrimNotas'

import PrevisaoComprasListaCompra from '../../components/previsao-compras/core/PrevisaoComprasListaCompra.vue'
import PrevisaoComprasCompraDetail from '../../components/previsao-compras/core/PrevisaoComprasCompraDetail.vue'

const store = usePrevisaoComprasStore()

const rowSelecionada = ref<IntegrimListaCompraRow | null>(null)
const detalheAberto = ref(false)
const printing = ref(false)

// Cruza as recomendações da IA (dashboard) por produto: idempresa-idproduto-idsubproduto.
const oportunidadesMap = computed(() => {
  const map = new Map<string, IntegrimCompraAiOportunidade[]>()
  for (const op of store.aiDashboard?.oportunidades || []) {
    const key = `${op.idempresa}-${op.idproduto}-${op.idsubproduto}`
    const arr = map.get(key)
    if (arr) arr.push(op)
    else map.set(key, [op])
  }
  return map
})

const oportunidadesDaLinha = computed(() => {
  const row = rowSelecionada.value
  if (!row) return []
  return oportunidadesMap.value.get(`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`) || []
})

const carregarListaCompra = (query: IntegrimListaCompraQuery = {}, options: { append?: boolean } = {}) =>
  store.fetchListaCompra(query, options)

const abrirDetalhe = (row: IntegrimListaCompraRow) => {
  rowSelecionada.value = row
  detalheAberto.value = true
}

const acaoOportunidade = async (input: {
  id: string
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
}) => {
  const result = await store.updateOportunidadeStatus(input.id, input.status)
  if (result) await store.fetchAiDashboard({ silent: true })
}

// Abre o PDF (gerado no servidor) numa nova aba. Usa fetch autenticado + blob
// para funcionar mesmo com apiBaseUrl em outra origem.
const baixarRelatorio = async (query: Record<string, string | number>) => {
  printing.value = true
  store.clearMessages()
  try {
    const blob = await getApiFetch()<Blob, 'blob'>('/api/integrim-notas/relatorio-compra.pdf', {
      query,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  catch (error) {
    store.errorMessage = getApiErrorMessage(error, 'Falha ao gerar o relatório em PDF.')
  }
  finally {
    printing.value = false
  }
}

const imprimirLista = (payload: { idempresa: number | null }) =>
  baixarRelatorio(payload.idempresa
    ? { escopo: 'empresa', idempresa: payload.idempresa }
    : { escopo: 'geral' })

const imprimirProduto = (row: IntegrimListaCompraRow) =>
  baixarRelatorio({
    escopo: 'produto',
    idempresa: row.idempresa,
    idproduto: row.idproduto,
    idsubproduto: row.idsubproduto,
  })

onMounted(async () => {
  if (!store.listaCompra.length && !store.loadingListaCompra) {
    await store.fetchListaCompra({ only_buy: true })
  }
  if (!store.aiDashboard && !store.loadingAiDashboard) {
    store.fetchAiDashboard({ silent: true })
  }
})
</script>

<template>
  <div class="space-y-5">
    <PrevisaoComprasListaCompra
      :rows="store.listaCompra"
      :stats="store.listaCompraStats"
      :loading="store.loadingListaCompra"
      :total-itens="store.listaCompraTotalItens"
      :oportunidades-map="oportunidadesMap"
      :printing="printing"
      @fetch="carregarListaCompra"
      @abrir="abrirDetalhe"
      @print="imprimirLista"
    />

    <PrevisaoComprasCompraDetail
      v-model="detalheAberto"
      :row="rowSelecionada"
      :oportunidades="oportunidadesDaLinha"
      :printing="printing"
      @opportunity-action="acaoOportunidade"
      @print="imprimirProduto"
    />
  </div>
</template>
