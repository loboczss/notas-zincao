<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Pencil, X } from 'lucide-vue-next'
import { useAuthStore } from '../../stores'

const authStore = useAuthStore()

const nome = computed(
  () => authStore.profile?.nome
    || authStore.user?.user_metadata?.full_name
    || authStore.user?.user_metadata?.name
    || authStore.user?.user_metadata?.nome
    || authStore.user?.email?.split('@')[0]
    || 'Usuario',
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
  if (!raw) return ''
  return new Date(raw).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

const roleLabel = computed(() => {
  const role = String(authStore.profile?.role || '').trim().toLowerCase()
  if (!role) return 'Usuario'
  if (role === 'admin') return 'Administrador'
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
  <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <img
            v-if="fotoPerfil"
            :src="fotoPerfil"
            alt="Foto de perfil"
            class="h-full w-full object-cover"
          >
          <span v-else>{{ inicial }}</span>
        </div>

        <div class="min-w-0 flex-1">
          <div v-if="!editando" class="min-w-0">
            <h2 class="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
              {{ nome }}
            </h2>
            <p class="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {{ email }}
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {{ roleLabel }}
              </span>
              <span v-if="joinDate">Desde {{ joinDate }}</span>
            </div>
          </div>

          <div v-else class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label class="sr-only" for="profile-name">Nome</label>
            <input
              id="profile-name"
              v-model="novoNome"
              class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              placeholder="Seu nome"
              maxlength="120"
              @keyup.enter="salvar"
              @keyup.escape="cancelarEdicao"
            >

            <div class="flex gap-2">
              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                :disabled="authStore.loading"
                title="Salvar"
                aria-label="Salvar"
                @click="salvar"
              >
                <Check class="h-4 w-4" />
              </button>

              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Cancelar"
                aria-label="Cancelar"
                @click="cancelarEdicao"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="!editando"
        type="button"
        class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="iniciarEdicao"
      >
        <Pencil class="h-4 w-4" />
        <span>Editar</span>
      </button>
    </div>
  </section>
</template>
