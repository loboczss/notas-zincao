<script setup lang="ts">
import { ref, watch } from 'vue'
import { Shield, User, X, Check, Trash2, AlertTriangle, Mail, Tag } from 'lucide-vue-next'
import ModalGlobal from '../ModalGlobal.vue'
import Botao from '../Botao.vue'
import type { AdminUserRecord, AdminUserRoleInput } from '../../../shared/types/AdminUsers'

const props = defineProps<{
  modelValue: boolean
  usuario: AdminUserRecord | null
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits(['update:modelValue', 'saved', 'deleted', 'reset-password'])

const selectedRole = ref<AdminUserRoleInput>('colaborador')
const confirmandoEdicao = ref(false)
const confirmandoExclusao = ref(false)
const confirmandoRecuperacao = ref(false)

watch(() => props.usuario, (newVal) => {
  if (newVal) {
    confirmandoEdicao.value = false
    confirmandoExclusao.value = false
    confirmandoRecuperacao.value = false
    const normalized = String(newVal.role || '').trim().toLowerCase()
    if (normalized === 'admin' || normalized === 'colaborador' || normalized === 'visualizador' || normalized === 'vendedor' || normalized === 'operador') {
      selectedRole.value = normalized === 'operador' ? 'colaborador' : normalized
      return
    }
    selectedRole.value = 'colaborador'
  }
}, { immediate: true })

const fechar = () => {
  confirmandoEdicao.value = false
  confirmandoExclusao.value = false
  confirmandoRecuperacao.value = false
  emit('update:modelValue', false)
}

const salvar = async () => {
  if (!props.usuario) return
  confirmandoEdicao.value = false
  emit('saved', {
    auth_uid: props.usuario.auth_uid,
    role: selectedRole.value
  })
}

const excluir = async () => {
  if (!props.usuario) return
  confirmandoExclusao.value = false
  emit('deleted', props.usuario.auth_uid)
}

const resetPassword = async () => {
  if (!props.usuario) return
  confirmandoRecuperacao.value = false
  emit('reset-password', props.usuario.auth_uid)
}
</script>

<template>
  <ModalGlobal
    :model-value="props.modelValue"
    title="Gerenciar Usuário"
    description="Configure os privilégios e credenciais de acesso do usuário."
    @update:model-value="fechar"
  >
    <div v-if="usuario" class="space-y-5 mt-4">
      
      <!-- Modo Confirmação Edição -->
      <div v-if="confirmandoEdicao" class="p-5 rounded-3xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm space-y-4 animate-fade-in">
        <div class="flex items-center gap-2 text-amber-500 font-bold text-sm">
          <AlertTriangle class="w-5 h-5" />
          Confirmar Alteração
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">
          Tem certeza que deseja alterar as permissões de <strong class="text-slate-200">{{ usuario.nome || usuario.email }}</strong>? Isso afetará imediatamente os acessos dele no sistema.
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Botao variant="secondary" type="button" class="px-4 py-2 text-xs" @click="confirmandoEdicao = false">Voltar</Botao>
          <Botao variant="primary" type="button" class="px-4 py-2 text-xs" :disabled="props.loading" @click="salvar">Confirmar</Botao>
        </div>
      </div>

      <!-- Modo Confirmação Exclusão -->
      <div v-else-if="confirmandoExclusao" class="p-5 rounded-3xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-sm space-y-4 animate-fade-in">
        <div class="flex items-center gap-2 text-rose-500 font-bold text-sm">
          <AlertTriangle class="w-5 h-5" />
          Excluir Conta
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">
          Esta operação é <strong class="text-rose-400">definitiva e irreversível</strong>. Todos os dados vinculados ao perfil de <strong class="text-slate-200">{{ usuario.nome || usuario.email }}</strong> serão desconectados.
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Botao variant="secondary" type="button" class="px-4 py-2 text-xs" @click="confirmandoExclusao = false">Cancelar</Botao>
          <Botao variant="primary" type="button" class="px-4 py-2 text-xs bg-rose-600 dark:bg-rose-600 hover:bg-rose-700 dark:hover:bg-rose-700 text-white" :disabled="props.loading" @click="excluir">Excluir Definitivamente</Botao>
        </div>
      </div>

      <!-- Modo Confirmação Recuperar Senha -->
      <div v-else-if="confirmandoRecuperacao" class="p-5 rounded-3xl border border-brand-500/20 bg-brand-500/5 backdrop-blur-sm space-y-4 animate-fade-in">
        <div class="flex items-center gap-2 text-brand-400 font-bold text-sm">
          <Mail class="w-5 h-5" />
          Recuperação de Acesso
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">
          Deseja enviar as instruções de redefinição de senha para o e-mail <strong class="text-slate-200">{{ usuario.email }}</strong>?
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Botao variant="secondary" type="button" class="px-4 py-2 text-xs" @click="confirmandoRecuperacao = false">Voltar</Botao>
          <Botao variant="primary" type="button" class="px-4 py-2 text-xs" :disabled="props.loading" @click="resetPassword">Enviar Link</Botao>
        </div>
      </div>

      <!-- Modo Normal -->
      <div v-else class="space-y-5">
        <!-- Perfil Minimalista -->
        <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 dark:bg-slate-950/50 border border-slate-800/50 dark:border-white/5 backdrop-blur-sm">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-inner">
            {{ String(usuario.nome || usuario.email || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <span class="block text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{{ usuario.nome || 'Sem nome' }}</span>
            <span class="block text-xs text-slate-500 dark:text-slate-400 truncate">{{ usuario.email || '-' }}</span>
          </div>
        </div>

        <!-- Nível de Permissão -->
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-1">
            Nível de Permissão
          </label>
          
          <div class="grid grid-cols-1 gap-2.5">
            
            <!-- Admin -->
            <label 
              class="group flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all duration-300"
              :class="selectedRole === 'admin' 
                ? 'border-brand-500/30 bg-brand-500/10 dark:border-brand-500/50 dark:bg-brand-500/5 shadow-lg shadow-brand-500/5' 
                : 'border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50/50 dark:hover:bg-slate-900/40'"
            >
              <input type="radio" v-model="selectedRole" value="admin" class="sr-only" />
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                :class="selectedRole === 'admin' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 group-hover:text-slate-300'"
              >
                <Shield class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <span class="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Administrador</span>
                <span class="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Acesso irrestrito às configurações do sistema.</span>
              </div>
              <div class="w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 duration-300"
                :class="selectedRole === 'admin' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-transparent'"
              >
                <Check v-if="selectedRole === 'admin'" class="w-2.5 h-2.5" />
              </div>
            </label>

            <!-- Operador / Colaborador -->
            <label 
              class="group flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all duration-300"
              :class="selectedRole === 'colaborador' 
                ? 'border-brand-500/30 bg-brand-500/10 dark:border-brand-500/50 dark:bg-brand-500/5 shadow-lg shadow-brand-500/5' 
                : 'border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50/50 dark:hover:bg-slate-900/40'"
            >
              <input type="radio" v-model="selectedRole" value="colaborador" class="sr-only" />
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                :class="selectedRole === 'colaborador' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 group-hover:text-slate-300'"
              >
                <User class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <span class="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Colaborador</span>
                <span class="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Gestão completa de notas, pedidos e movimentações.</span>
              </div>
              <div class="w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 duration-300"
                :class="selectedRole === 'colaborador' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-transparent'"
              >
                <Check v-if="selectedRole === 'colaborador'" class="w-2.5 h-2.5" />
              </div>
            </label>

            <!-- Visualizador -->
            <label 
              class="group flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all duration-300"
              :class="selectedRole === 'visualizador' 
                ? 'border-brand-500/30 bg-brand-500/10 dark:border-brand-500/50 dark:bg-brand-500/5 shadow-lg shadow-brand-500/5' 
                : 'border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50/50 dark:hover:bg-slate-900/40'"
            >
              <input type="radio" v-model="selectedRole" value="visualizador" class="sr-only" />
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                :class="selectedRole === 'visualizador' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 group-hover:text-slate-300'"
              >
                <X class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <span class="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Visualizador</span>
                <span class="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Consulta rápida de registros e geração de relatórios.</span>
              </div>
              <div class="w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 duration-300"
                :class="selectedRole === 'visualizador' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-transparent'"
              >
                <Check v-if="selectedRole === 'visualizador'" class="w-2.5 h-2.5" />
              </div>
            </label>

            <!-- Vendedor -->
            <label 
              class="group flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all duration-300"
              :class="selectedRole === 'vendedor' 
                ? 'border-brand-500/30 bg-brand-500/10 dark:border-brand-500/50 dark:bg-brand-500/5 shadow-lg shadow-brand-500/5' 
                : 'border-slate-200/50 dark:border-white/5 bg-white dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50/50 dark:hover:bg-slate-900/40'"
            >
              <input type="radio" v-model="selectedRole" value="vendedor" class="sr-only" />
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                :class="selectedRole === 'vendedor' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 group-hover:text-slate-300'"
              >
                <Tag class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <span class="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Vendedor</span>
                <span class="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Gestão simplificada para lançamento de vendas e notas.</span>
              </div>
              <div class="w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 duration-300"
                :class="selectedRole === 'vendedor' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-transparent'"
              >
                <Check v-if="selectedRole === 'vendedor'" class="w-2.5 h-2.5" />
              </div>
            </label>
          </div>
        </div>

        <p v-if="props.errorMessage" class="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-xs text-rose-400 backdrop-blur-sm">
          {{ props.errorMessage }}
        </p>

        <!-- Ações Administrativas -->
        <div class="flex items-center justify-start gap-6 pt-4 border-t border-slate-100/5 dark:border-white/5 mt-6">
          <!-- Botão Recuperar -->
          <button 
            type="button"
            class="group flex items-center gap-2 text-slate-400 hover:text-brand-400 dark:hover:text-indigo-400 text-xs font-bold transition-all duration-300"
            @click="confirmandoRecuperacao = true"
          >
            <Mail class="w-4 h-4 text-brand-500 dark:text-indigo-400 transition-transform group-hover:scale-110 duration-300" />
            Recuperar Senha
          </button>

          <!-- Botão Excluir -->
          <button 
            type="button"
            class="group flex items-center gap-2 text-slate-400 hover:text-rose-500 text-xs font-bold transition-all duration-300"
            @click="confirmandoExclusao = true"
          >
            <Trash2 class="w-4 h-4 text-rose-500 transition-transform group-hover:scale-110 duration-300" />
            Excluir Usuário
          </button>
        </div>

        <!-- Ações de Fluxo -->
        <div class="flex justify-end gap-3 pt-4">
          <Botao variant="secondary" type="button" class="px-5 py-2.5 text-xs font-semibold" @click="fechar">Cancelar</Botao>
          <Botao variant="primary" type="button" class="px-6 py-2.5 text-xs font-black shadow-lg shadow-brand-500/20" :disabled="props.loading" @click="confirmandoEdicao = true">
            {{ props.loading ? 'Salvando...' : 'Salvar Alteração' }}
          </Botao>
        </div>
      </div>
    </div>
  </ModalGlobal>
</template>
