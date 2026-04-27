<script setup lang="ts">
import { computed } from 'vue'
import { 
  History, 
  User, 
  Calendar, 
  ArrowRight, 
  FileEdit, 
  Trash2, 
  CheckCircle2, 
  Info,
  Clock
} from 'lucide-vue-next'
import type { NotaHistoricoEdicao } from '~~/shared/types/NotasRetirada'

const props = defineProps<{
  historico: NotaHistoricoEdicao[]
  loading?: boolean
}>()

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActionType = (item: any) => {
  const antes = getParsedData(item.dados_anteriores)
  const novos = getParsedData(item.dados_novos)
  
  if (!antes && novos) return 'create'
  if (novos?.deleted_at) return 'delete'
  return 'edit'
}

const getIcon = (item: any) => {
  const type = getActionType(item)
  if (type === 'create') return CheckCircle2
  if (type === 'delete') return Trash2
  return FileEdit
}

const getIconColor = (item: any) => {
  const type = getActionType(item)
  if (type === 'create') return 'text-emerald-500 border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10'
  if (type === 'delete') return 'text-rose-500 border-rose-500/20 bg-rose-50 dark:bg-rose-500/10'
  return 'text-amber-500 border-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
}

const getParsedData = (data: any) => {
  if (!data) return null
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return null }
  }
  return data
}

const getChanges = (item: any) => {
  const antes = getParsedData(item.dados_anteriores)
  const novos = getParsedData(item.dados_novos)
  
  if (!antes || !novos) return []
  
  const changes = []
  const keys = Object.keys(novos)
  
  for (const key of keys) {
    const oldVal = antes[key]
    const newVal = novos[key]
    
    if ([
      'updated_at', 'atualizado_em', 'deleted_at', 'deleted_by', 
      'id', 'owner_user_id', 'criado_em', 'historico_retiradas'
    ].includes(key)) continue
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        key,
        label: formatFieldName(key),
        old: oldVal,
        new: newVal
      })
    }
  }
  return changes
}

const formatValue = (key: string, value: any) => {
  if (value === null || value === undefined || value === '') return '(Vazio)'
  
  if (key.includes('valor') || key.includes('preço') || key.includes('desconto')) {
    const val = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  if (key.includes('data') || key.includes('_em') || key.includes('_at')) {
    if (typeof value === 'string' && value.includes('-')) {
      try {
        const d = new Date(value)
        return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      } catch { return value }
    }
  }

  return value
}

const formatFieldName = (key: string) => {
  const labels: Record<string, string> = {
    nome_cliente: 'o nome do cliente',
    documento_cliente: 'o documento do cliente',
    telefone_cliente: 'o telefone de contato',
    status_retirada: 'o status da nota',
    data_prevista_retirada: 'a data prevista de retirada',
    valor_total: 'o valor total da nota',
    observacoes: 'as observações',
    produtos: 'os itens da nota',
    desconto_total: 'o valor do desconto',
    numero_nota: 'o número da nota',
    serie_nota: 'a série da nota',
    contato_id: 'o contato vinculado'
  }
  return labels[key] || key
}
</script>

<template>
  <div class="relative">
    <div v-if="loading" class="flex flex-col items-center justify-center py-12 space-y-4">
      <div class="relative">
        <Clock class="h-10 w-10 text-zinc-300 animate-spin" />
      </div>
      <p class="text-zinc-500 text-xs font-medium uppercase tracking-widest animate-pulse">Carregando Auditoria</p>
    </div>

    <div v-else-if="!historico || historico.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="h-20 w-20 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800">
        <History class="h-10 w-10 text-zinc-300" />
      </div>
      <h3 class="text-zinc-900 dark:text-zinc-100 font-bold text-lg">Histórico Limpo</h3>
      <p class="text-zinc-500 text-sm max-w-[280px] mt-2 leading-relaxed">
        Não há registros de alterações manuais para esta nota.
      </p>
    </div>

    <div v-else class="relative pl-10 space-y-12 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-20px)] before:w-px before:bg-gradient-to-b before:from-zinc-200 before:via-zinc-200 before:to-transparent dark:before:from-zinc-800 dark:before:via-zinc-800">
      <div v-for="item in (historico as any)" :key="item.id" class="relative group">
        <div 
          class="absolute -left-[43px] top-0 flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm z-10 transition-transform duration-300 group-hover:scale-110"
          :class="getIconColor(item)"
        >
          <component :is="getIcon(item)" class="h-4 w-4" />
        </div>

        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
                <User class="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {{ item.profiles?.nome || 'Usuário do Sistema' }}
                </p>
                <p class="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Clock class="h-3 w-3" />
                  {{ formatDateTime(item.created_at) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span v-if="getActionType(item) === 'delete'" class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white">Nota Excluída</span>
              <span v-else-if="getActionType(item) === 'create'" class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white">Nota Criada</span>
            </div>
          </div>

          <div class="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div v-if="getChanges(item).length > 0" class="space-y-4">
              <div v-for="change in getChanges(item)" :key="change.key" class="group/change">
                <div class="flex items-start gap-3">
                  <div class="mt-1 h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover/change:bg-amber-500 transition-colors"></div>
                  <div class="flex-1">
                    <p class="text-sm text-zinc-600 dark:text-zinc-400">
                      Alterou <span class="font-bold text-zinc-900 dark:text-zinc-200">{{ change.label }}</span>
                    </p>
                    
                    <div v-if="change.key === 'produtos'" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <span class="text-[10px] font-bold text-zinc-400 uppercase">Antes:</span>
                        <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                          <ul class="space-y-1 text-xs text-zinc-500">
                            <li v-for="p in (change.old || [])" :key="p.nome">{{ p.quantidade }}{{ p.unidade }} {{ p.nome }}</li>
                            <li v-if="!change.old?.length" class="italic">Vazio</li>
                          </ul>
                        </div>
                      </div>
                      <div class="space-y-2">
                        <span class="text-[10px] font-bold text-amber-500 uppercase">Depois:</span>
                        <div class="p-3 rounded-xl bg-amber-50/30 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20">
                          <ul class="space-y-1 text-xs text-zinc-700 dark:text-zinc-200">
                            <li v-for="p in (change.new || [])" :key="p.nome" class="flex items-center gap-2">
                              <CheckCircle2 class="h-3 w-3 text-emerald-500" />
                              <span class="font-bold">{{ p.quantidade }}{{ p.unidade }}</span> {{ p.nome }}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div v-else class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div class="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 line-through">
                        {{ formatValue(change.key, change.old) }}
                      </div>
                      <ArrowRight class="hidden sm:block h-3 w-3 text-zinc-300" />
                      <div class="px-3 py-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {{ formatValue(change.key, change.new) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="getActionType(item) === 'delete'" class="flex items-center gap-3 text-rose-500">
              <Trash2 class="h-4 w-4" />
              <p class="text-sm font-bold italic">Nota movida para a lixeira.</p>
            </div>
            <p v-else class="text-xs text-zinc-400 italic">Alteração realizada com sucesso.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
}
.dark .glass-card {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(8px);
}
</style>
