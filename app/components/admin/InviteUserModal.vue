<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Mail, Shield, UserPlus, X, Check, Tag } from 'lucide-vue-next'
import ModalGlobal from '../ModalGlobal.vue'
import Botao from '../Botao.vue'
import type { AdminInviteUserPayload, AdminUserRoleInput } from '../../../shared/types/AdminUsers'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  errorMessage?: string
  successMessage?: string
}>()

const emit = defineEmits(['update:modelValue', 'invited'])

const form = reactive({
  email: '',
  nome: '',
  role: 'colaborador' as AdminUserRoleInput
})

const fechar = () => {
  form.email = ''
  form.nome = ''
  form.role = 'colaborador'
  emit('update:modelValue', false)
}

const enviarConvite = async () => {
  if (!form.email) return
  const payload: AdminInviteUserPayload = {
    email: form.email,
    nome: form.nome || undefined,
    role: form.role,
  }

  emit('invited', payload)
}

watch(() => props.successMessage, (value) => {
  if (!value || !props.modelValue) {
    return
  }

  setTimeout(() => {
    fechar()
  }, 1200)
})
</script>

<template>
  <ModalGlobal
    :model-value="props.modelValue"
    title="Convidar Novo Usuário"
    description="Envie um convite de acesso com as permissões apropriadas."
    @update:model-value="fechar"
  >
    <div v-if="props.successMessage" class="flex flex-col items-center justify-center py-6 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
        <Check class="h-6 w-6" />
      </div>
      <p class="text-sm font-bold text-slate-900 dark:text-white">Convite enviado</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ props.successMessage }}</p>
    </div>

    <form v-else class="space-y-4 mt-2" @submit.prevent="enviarConvite">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Nome Completo
        </label>
        <input
          v-model="form.nome"
          type="text"
          placeholder="Ex: João Silva"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          E-mail do Usuário
        </label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="usuario@empresa.com"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
          Nível de Permissão
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <!-- Admin -->
          <label 
            class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
            :class="form.role === 'admin' 
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 dark:border-brand-500' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'"
          >
            <input type="radio" v-model="form.role" value="admin" class="sr-only" />
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="form.role === 'admin' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
            >
              <Shield class="w-4 h-4" />
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-900 dark:text-white">Admin</span>
              <span class="block text-[10px] text-slate-500 dark:text-slate-400">Acesso total</span>
            </div>
          </label>

          <!-- Colaborador -->
          <label 
            class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
            :class="form.role === 'colaborador' 
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 dark:border-brand-500' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'"
          >
            <input type="radio" v-model="form.role" value="colaborador" class="sr-only" />
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="form.role === 'colaborador' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
            >
              <UserPlus class="w-4 h-4" />
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-900 dark:text-white">Colaborador</span>
              <span class="block text-[10px] text-slate-500 dark:text-slate-400">Criar e editar</span>
            </div>
          </label>

          <!-- Visualizador -->
          <label 
            class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
            :class="form.role === 'visualizador' 
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 dark:border-brand-500' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'"
          >
            <input type="radio" v-model="form.role" value="visualizador" class="sr-only" />
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="form.role === 'visualizador' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
            >
              <X class="w-4 h-4" />
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-900 dark:text-white">Visualizador</span>
              <span class="block text-[10px] text-slate-500 dark:text-slate-400">Apenas ver</span>
            </div>
          </label>

          <!-- Vendedor -->
          <label 
            class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
            :class="form.role === 'vendedor' 
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 dark:border-brand-500' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'"
          >
            <input type="radio" v-model="form.role" value="vendedor" class="sr-only" />
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="form.role === 'vendedor' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
            >
              <Tag class="w-4 h-4" />
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-900 dark:text-white">Vendedor</span>
              <span class="block text-[10px] text-slate-500 dark:text-slate-400">Lançar notas</span>
            </div>
          </label>
        </div>
      </div>

      <p v-if="props.errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
        {{ props.errorMessage }}
      </p>

      <div class="flex justify-end gap-2 pt-2">
        <Botao variant="secondary" type="button" @click="fechar">Cancelar</Botao>
        <Botao variant="primary" type="submit" :disabled="props.loading || !form.email">
          {{ props.loading ? 'Enviando...' : 'Enviar Convite' }}
        </Botao>
      </div>
    </form>
  </ModalGlobal>
</template>
