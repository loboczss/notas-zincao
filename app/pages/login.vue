<script setup lang="ts">
import { ref } from 'vue'
import AuthPageShell from '../components/layout/AuthPageShell.vue'
import LoginAbaCadastrar from '../components/login/LoginAbaCadastrar.vue'
import LoginAbaEntrar from '../components/login/LoginAbaEntrar.vue'

const abaAtiva = ref<'entrar' | 'cadastrar'>('entrar')
</script>

<template>
  <AuthPageShell
    title="Login"
    description="Acesse sua conta ou crie um novo cadastro para continuar operando as notas de retirada."
  >
    <div>
      <div class="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        <button
          id="tab-entrar"
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="abaAtiva === 'entrar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'"
          @click="abaAtiva = 'entrar'"
        >
          Entrar
        </button>
        <button
          id="tab-cadastrar"
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="abaAtiva === 'cadastrar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'"
          @click="abaAtiva = 'cadastrar'"
        >
          Cadastrar
        </button>
      </div>

      <div class="mt-5">
        <LoginAbaEntrar v-if="abaAtiva === 'entrar'" />
        <LoginAbaCadastrar v-else />
      </div>
    </div>
  </AuthPageShell>
</template>
