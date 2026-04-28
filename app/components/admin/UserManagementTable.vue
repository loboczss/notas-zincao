<script setup lang="ts">
import { Shield, User, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import Card from '../Card.vue'
import type { AdminUserRecord } from '../../../shared/types/AdminUsers'

const props = defineProps<{
  usuarios: AdminUserRecord[]
  loading?: boolean
}>()

const emit = defineEmits(['editRole', 'toggleStatus', 'delete'])

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const getRoleBadgeClass = (role: string) => {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
    case 'colaborador':
    case 'operador':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'visualizador':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    case 'vendedor':
      return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20 shadow-sm'
    default:
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  }
}

const getRoleLabel = (role: string) => {
  switch (String(role || '').toLowerCase()) {
    case 'admin': return 'Admin'
    case 'colaborador': return 'Colaborador'
    case 'operador': return 'Operador'
    case 'visualizador': return 'Leitura'
    case 'vendedor': return 'Vendedor'
    default: return 'Sem Permissão'
  }
}

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'ativo':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'pendente':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    default:
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  }
}

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'ativo': return 'Ativo'
    case 'pendente': return 'Pendente'
    default: return 'Inativo'
  }
}
</script>

<template>
  <Card padding-class="p-0">
    <div class="overflow-x-auto custom-scrollbar">
      <table class="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr class="border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30 dark:bg-slate-950/20">
            <th class="py-4 px-6 font-bold">Usuário</th>
            <th class="py-4 px-4 font-bold">Permissão</th>
            <th class="py-4 px-4 font-bold">Status</th>
            <th class="py-4 px-4 font-bold">Membro Desde</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-sm">
          <!-- Loading State -->
          <tr v-if="props.loading">
            <td colspan="4" class="py-10 text-center text-slate-400 text-xs font-medium">
              Carregando usuários...
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="!props.usuarios.length">
            <td colspan="4" class="py-10 text-center text-slate-400 text-xs font-medium">
              Nenhum usuário encontrado.
            </td>
          </tr>

          <!-- Users List -->
          <tr 
            v-for="user in props.usuarios" 
            :key="user.id"
            class="group hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors cursor-pointer"
            @click="emit('editRole', user)"
          >
            <!-- Nome & Email -->
            <td class="py-3.5 px-6">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                  {{ String(user.nome || user.email || '?').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <span class="block font-bold text-slate-900 dark:text-slate-100">{{ user.nome || 'Sem nome' }}</span>
                  <span class="block text-xs text-slate-500 dark:text-slate-400">{{ user.email || '-' }}</span>
                </div>
              </div>
            </td>

            <!-- Permissão -->
            <td class="py-3.5 px-4">
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border', getRoleBadgeClass(String(user.role || ''))]">
                <Shield v-if="user.role === 'admin'" class="w-3 h-3" />
                <User v-else class="w-3 h-3" />
                {{ getRoleLabel(String(user.role || '')) }}
              </span>
            </td>

            <!-- Status -->
            <td class="py-3.5 px-4">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border', getStatusBadgeClass(user.status)]">
                {{ getStatusLabel(user.status) }}
              </span>
            </td>

            <!-- Membro Desde -->
            <td class="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
              {{ formatDate(user.membro_desde || user.updated_at || user.ultimo_login || '') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.2);
  border-radius: 20px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.4);
}
</style>
