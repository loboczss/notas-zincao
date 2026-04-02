<script setup lang="ts">
import { computed, ref } from 'vue'
import { Mail, User, Pencil, Check, X, ShieldCheck } from 'lucide-vue-next'
import { useAuthStore } from '../../stores'

const authStore = useAuthStore()

const nome = computed(
  () => authStore.profile?.nome
    || authStore.user?.user_metadata?.full_name
    || authStore.user?.user_metadata?.name
    || authStore.user?.user_metadata?.nome
    || authStore.user?.email?.split('@')[0]
    || 'Usuário',
)

const email = computed(
  () => authStore.user?.email || authStore.profile?.email || '',
)

const fotoPerfil = computed(
  () => authStore.profile?.foto_perfil
    || authStore.user?.user_metadata?.avatar_url
    || authStore.user?.user_metadata?.picture
    || '',
)

const inicial = computed(() => nome.value.charAt(0).toUpperCase())

const joinDate = computed(() => {
  const raw = authStore.user?.created_at
  if (!raw) return null
  return new Date(raw).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

const roleLabel = computed(() => {
  const role = String(authStore.profile?.role || '').trim().toLowerCase()
  if (!role) {
    return 'Usuario'
  }

  if (role === 'admin') {
    return 'Administrador'
  }

  return role.charAt(0).toUpperCase() + role.slice(1)
})

const editando = ref(false)
const novoNome = ref('')

const iniciarEdicao = () => {
  novoNome.value = nome.value
  editando.value = true
}

const cancelarEdicao = () => {
  editando.value = false
}

const salvar = async () => {
  const trimmed = novoNome.value.trim()
  if (!trimmed || trimmed === nome.value) {
    editando.value = false
    return
  }
  await authStore.updateProfile({ nome: trimmed })
  editando.value = false
}
</script>

<template>
  <div class="relative overflow-hidden rounded-3xl p-8">
    <!-- Glassmorphism Background -->
    <div class="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/20 dark:border-white/5" />

    <!-- Decorative blobs -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl anim-blob pointer-events-none" />
    <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-slate-400/10 rounded-full blur-3xl anim-blob-delayed pointer-events-none" />

    <div class="relative flex flex-col md:flex-row items-center gap-8">
      <!-- Avatar -->
      <div class="relative group shrink-0">
        <div class="absolute -inset-1 bg-gradient-to-tr from-amber-400/35 to-slate-400/25 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-700" />
        <div class="relative flex items-center justify-center w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden">
          <img v-if="fotoPerfil" :src="fotoPerfil" alt="Foto de perfil" class="h-full w-full object-cover" />
          <span v-else class="text-4xl font-black text-slate-900 dark:text-white">{{ inicial }}</span>
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 text-center md:text-left">
        <!-- Name row -->
        <div v-if="!editando" class="flex flex-col md:flex-row md:items-center gap-2 mb-2">
          <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white capitalize">
            {{ nome }}
          </h1>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 text-xs font-bold tracking-wide">
            <ShieldCheck class="w-3.5 h-3.5" />
            {{ roleLabel }}
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            @click="iniciarEdicao"
          >
            <Pencil class="w-3.5 h-3.5" />
            Editar
          </button>
        </div>

        <!-- Edit name inline -->
        <div v-else class="flex items-center gap-2 mb-2">
          <input
            v-model="novoNome"
            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors w-full max-w-xs"
            placeholder="Seu nome"
            maxlength="120"
            @keyup.enter="salvar"
            @keyup.escape="cancelarEdicao"
          />
          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
            :disabled="authStore.loading"
            @click="salvar"
          >
            <Check class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            @click="cancelarEdicao"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col md:flex-row md:items-center gap-4 text-slate-500 dark:text-slate-400">
          <div class="flex items-center justify-center md:justify-start gap-2">
            <Mail class="w-4 h-4 shrink-0" />
            <span class="text-sm font-medium">{{ email }}</span>
          </div>
          <div v-if="joinDate" class="hidden md:block w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <div v-if="joinDate" class="flex items-center justify-center md:justify-start gap-2">
            <User class="w-4 h-4 shrink-0" />
            <span class="text-sm font-medium">Membro desde {{ joinDate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes blob {
  0% { transform: scale(1); }
  33% { transform: scale(1.1) translate(20px, -20px); }
  66% { transform: scale(0.9) translate(-20px, 20px); }
  100% { transform: scale(1); }
}

.anim-blob { animation: blob 7s infinite alternate ease-in-out; }
.anim-blob-delayed { animation: blob 10s infinite alternate-reverse ease-in-out; }
</style>
