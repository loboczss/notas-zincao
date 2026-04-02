<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, Phone, UserRound, ArrowRight, Package, Wallet, CheckCircle2, Info, Camera, ClipboardList } from 'lucide-vue-next'
import type { NotaRetiradaDetalheItem, NotaProduto } from '../../../shared/types/NotasRetirada'
import NotasStatusBadge from './NotasStatusBadge.vue'

const props = withDefaults(defineProps<{
  nota: NotaRetiradaDetalheItem | null
}>(), {})

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const produtos = computed(() => Array.isArray(props.nota?.produtos) ? props.nota!.produtos : [])

// Métricas Organizacionais (Stats)
const stats = computed(() => {
  const totalItens = produtos.value.length
  const totalComprado = produtos.value.reduce((acc, p) => acc + toNumber(p.quantidade), 0)
  const totalRetirado = produtos.value.reduce((acc, p) => acc + toNumber(p.quantidade_retirada), 0)
  const totalValor = props.nota?.valor_total || 0
  
  return {
    totalItens,
    totalComprado,
    totalRetirado,
    saldoPendente: Math.max(0, totalComprado - totalRetirado),
    valorTotal: totalValor
  }
})

const historico = computed(() => {
  const raw = Array.isArray(props.nota?.historico_retiradas) ? props.nota!.historico_retiradas : []
  return [...raw].sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime())
})

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

const formatCurrency = (value?: number | string) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(value))
}

const saldoItem = (produto: NotaProduto) => {
  const comprado = Math.max(0, toNumber(produto.quantidade))
  const retirado = Math.max(0, toNumber(produto.quantidade_retirada))
  return Math.max(0, comprado - retirado)
}

const previewImage = ref<string | null>(null)
</script>

<template>
  <div v-if="nota" class="animate-fade-in space-y-8 py-2">
    <!-- StatusBar Coesa: Métricas compactas e modernas -->
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[2.5rem] border px-10 py-6 dark:border-white/5 dark:bg-white/[0.02]">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
          <Package class="h-6 w-6" />
        </div>
        <div>
          <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Itens</span>
          <span class="text-xl font-black text-slate-900 dark:text-white">{{ stats.totalComprado }}</span>
        </div>
      </div>

      <div class="h-10 w-px bg-slate-100 dark:bg-white/5 hidden md:block" />

      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <CircleDashed class="h-6 w-6" />
        </div>
        <div>
          <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pendentes</span>
          <span class="text-xl font-black text-amber-600 dark:text-amber-400">{{ stats.saldoPendente }}</span>
        </div>
      </div>

      <div class="h-10 w-px bg-slate-100 dark:bg-white/5 hidden md:block" />

      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 class="h-6 w-6" />
        </div>
        <div>
          <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Concluídas</span>
          <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ stats.totalRetirado }}</span>
        </div>
      </div>
    </div>

    <!-- Layout Principal: Dossiê Organizado -->
    <div class="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div class="space-y-8">
        <!-- Bloco: Contexto da Nota -->
        <section class="glass-card relative overflow-hidden rounded-[40px] border p-8 dark:border-white/5 dark:bg-white/[0.03]">
          <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/5 blur-3xl" />
          
          <div class="relative">
            <div class="mb-8 flex items-center justify-between border-b border-slate-100 pb-6 dark:border-white/5">
              <div>
                <h4 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Dossiê de Origem</h4>
                <div class="mt-2 flex items-center gap-3">
                  <span class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">#{{ nota.numero_nota }}</span>
                  <NotasStatusBadge :status="nota.status_retirada" />
                </div>
              </div>
              <div class="text-right">
                <span class="block text-[10px] font-bold uppercase text-slate-400">Série</span>
                <span class="text-xl font-black text-brand-500">{{ nota.serie_nota }}</span>
              </div>
            </div>

            <div class="grid gap-12 md:grid-cols-2">
              <div class="space-y-6">
                <!-- Titular -->
                <div class="flex items-center gap-5">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-500">
                    <UserRound class="h-7 w-7" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Titular da Nota</p>
                    <p class="truncate text-xl font-black text-slate-900 dark:text-white">{{ nota.nome_cliente }}</p>
                    <div v-if="nota.telefone_cliente" class="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                      <div class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {{ nota.telefone_cliente }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-6">
                <!-- Registro -->
                <div class="flex items-center gap-5">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
                    <Calendar class="h-7 w-7" />
                  </div>
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Registro & Datas</p>
                    <p class="text-sm font-black text-slate-800 dark:text-slate-200">Compra: {{ formatDate(nota.data_compra) }}</p>
                    <div class="mt-1 space-y-0.5">
                      <p class="text-[10px] font-bold text-slate-400 italic">Cadastrado em {{ formatDateTime(nota.criado_em) }}</p>
                      <p v-if="nota.cadastrado_por_nome" class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-brand-500">
                        <CheckCircle2 class="h-3 w-3" />
                        Por: {{ nota.cadastrado_por_nome }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Bloco: Objetos de Produto -->
        <section class="space-y-4">
          <div class="flex items-center justify-between px-2">
            <h4 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Itens do Pedido</h4>
            <span class="text-[10px] font-bold text-slate-400">{{ nota.produtos?.length || 0 }} objetos listados</span>
          </div>
          
          <div class="space-y-3">
            <div 
              v-for="(produto, index) in nota.produtos" 
              :key="index"
              class="group relative flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50/50 p-5 transition-all hover:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5">
                    <Package class="h-6 w-6" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-slate-900 dark:text-white">{{ produto.nome }}</p>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">SKU #{{ produto.id_produto_estoque }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-8 text-right">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Qtd</p>
                    <p class="text-xs font-black text-slate-700 dark:text-slate-300">{{ toNumber(produto.quantidade) }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Entregue</p>
                    <p class="text-xs font-black text-emerald-600 tracking-tight">{{ toNumber(produto.quantidade_retirada) || 0 }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Saldo</p>
                    <p class="text-xs font-black text-amber-600 tracking-tight">{{ saldoItem(produto) }}</p>
                  </div>
                </div>
              </div>

              <!-- Barra de Progresso High-End -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span class="text-slate-400">Progresso de Retirada</span>
                  <span :class="toNumber(produto.quantidade_retirada) >= toNumber(produto.quantidade) ? 'text-emerald-500' : 'text-brand-500'">
                    {{ Math.round((toNumber(produto.quantidade_retirada) / toNumber(produto.quantidade)) * 100) }}%
                  </span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div 
                    class="h-full rounded-full transition-all duration-1000"
                    :class="toNumber(produto.quantidade_retirada) >= toNumber(produto.quantidade) ? 'bg-emerald-500' : 'bg-brand-500'"
                    :style="{ width: `${Math.min(100, (toNumber(produto.quantidade_retirada) / toNumber(produto.quantidade)) * 100)}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Barra Lateral: Organizadores Auxiliares -->
      <aside class="space-y-8">
        <!-- Cupom Organizado -->
        <section v-if="nota.foto_url" class="space-y-4">
          <h4 class="px-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Evidência Fiscal</h4>
          <div
            class="group relative block aspect-[4/5] cursor-pointer overflow-hidden rounded-[2.5rem] border-8 border-white bg-slate-100 shadow-2xl transition-all hover:scale-[1.02] dark:border-white/5 dark:bg-white/5"
            @click="previewImage = nota.foto_url"
          >
            <img :src="nota.foto_url" alt="Cupom" class="h-full w-full object-cover grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0">
            <div class="absolute inset-0 flex items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100">
              <span class="rounded-full bg-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-2xl">Visualizar Objeto</span>
            </div>
          </div>
        </section>

        <!-- Timeline Detalhada de Operações -->
        <section v-if="historico.length" class="space-y-4">
          <div class="flex items-center justify-between px-2">
            <h4 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Log de Operações</h4>
            <span class="text-[10px] font-bold text-brand-500">{{ historico.length }} eventos</span>
          </div>

          <div class="space-y-4">
            <div 
              v-for="(item, index) in historico" 
              :key="index"
              class="relative flex gap-4 pl-6"
            >
              <!-- Linha da Timeline -->
              <div v-if="index !== historico.length - 1" class="absolute bottom-0 left-[31px] top-8 w-px bg-slate-200 dark:bg-white/10" />
              
              <div class="relative z-10 flex h-4 w-4 shrink-0 translate-y-2 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-900" />
              
              <div class="flex-1 space-y-3 pb-8">
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{ formatDateTime(item.data) }}</span>
                  <p class="text-sm font-black text-slate-900 dark:text-white">Retirada Efetuada</p>
                </div>

                <div class="rounded-2xl border border-slate-100 bg-white/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <UserRound class="h-3 w-3" />
                      Por: {{ item.responsavel_nome || 'Sistema' }}
                    </div>
                  </div>

                  <!-- Itens Retirados Nesta Operação -->
                  <div v-if="item.itens_retirados?.length" class="mt-3 space-y-2 rounded-xl bg-slate-50/50 p-3 dark:bg-white/5">
                    <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Produtos Retirados</p>
                    <div class="space-y-1.5">
                      <div 
                        v-for="(it, itIdx) in item.itens_retirados" 
                        :key="itIdx"
                        class="flex items-center justify-between text-[10px]"
                      >
                        <span class="truncate font-bold text-slate-700 dark:text-slate-300">
                          {{ nota.produtos?.[it.index]?.nome || 'Produto' }}
                        </span>
                        <span class="ml-2 shrink-0 font-black text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-lg text-[9px]">
                          {{ it.quantidade }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Miniaturas -->
                  <div v-if="item.fotos?.length" class="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <div 
                      v-for="(foto, fIdx) in item.fotos" 
                      :key="fIdx"
                      class="h-12 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slate-100 border border-white dark:border-white/5 transition-transform hover:scale-105"
                      @click="previewImage = foto"
                    >
                      <img :src="foto" class="h-full w-full object-cover">
                    </div>
                  </div>

                  <div v-if="item.observacoes" class="mt-3 flex gap-2 rounded-xl bg-slate-50 p-2 text-[10px] text-slate-500 dark:bg-white/5">
                    <ClipboardList class="h-3 w-3 shrink-0" />
                    {{ item.observacoes }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA Principal -->
        <div class="sticky top-6 pt-4">
          <NuxtLink
            :to="`/notas/${nota.id}/retirada`"
            class="group flex w-full items-center justify-center gap-3 rounded-[2.5rem] bg-amber-600 py-6 text-lg font-black text-white shadow-2xl shadow-amber-500/30 transition-all hover:-translate-y-1 hover:bg-amber-500 active:scale-95"
          >
            Efetuar Retirada
            <ArrowRight class="h-6 w-6 transition-transform group-hover:translate-x-1" />
          </NuxtLink>
        </div>
      </aside>
    </div>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-20 text-center opacity-40">
    <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-slate-300 dark:border-white/10">
      <ArrowRight class="h-8 w-8 -rotate-45 text-slate-300 dark:text-white/20" />
    </div>
    <p class="text-sm font-bold uppercase tracking-widest text-slate-400">Selecione uma nota da lista</p>
  </div>

  <!-- Visualizador de Imagem (Zoom Modal) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="previewImage" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10">
        <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" @click="previewImage = null" />
        
        <div class="relative max-h-full max-w-full overflow-hidden rounded-[2.5rem] bg-black shadow-2xl ring-1 ring-white/10">
          <button 
            type="button"
            class="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60 hover:scale-110 active:scale-95"
            @click="previewImage = null"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          
          <img 
            :src="previewImage" 
            class="h-full max-h-[90vh] w-auto object-contain transition-transform duration-500"
            alt="Preview"
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
