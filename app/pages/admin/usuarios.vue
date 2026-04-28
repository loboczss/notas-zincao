<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UserPlus, Search, Users, ShieldCheck, UserCheck } from 'lucide-vue-next'
import AppPageShell from '../../components/layout/AppPageShell.vue'
import Botao from '../../components/Botao.vue'
import Card from '../../components/Card.vue'
import UserManagementTable from '../../components/admin/UserManagementTable.vue'
import InviteUserModal from '../../components/admin/InviteUserModal.vue'
import EditUserModal from '../../components/admin/EditUserModal.vue'
import type {
  AdminInviteUserPayload,
  AdminUsersListQuery,
  AdminUsersSortBy,
  AdminUsersSortDir,
  AdminUpdateUserRolePayload,
  AdminUserRecord,
  AdminUserStatus,
} from '../../../shared/types/AdminUsers'
import { useAdminUsersStore, useAuthStore } from '../../stores'

definePageMeta({
  middleware: ['auth', 'admin'],
})

const authStore = useAuthStore()
const adminUsersStore = useAdminUsersStore()

const busca = ref('')
const statusFiltro = ref<'todos' | AdminUserStatus>('todos')
const sortBy = ref<AdminUsersSortBy>('membro_desde')
const sortDir = ref<AdminUsersSortDir>('desc')
const modalInviteAberto = ref(false)
const modalEditAberto = ref(false)
const usuarioSelecionado = ref<AdminUserRecord | null>(null)

const totalUsers = computed(() => adminUsersStore.stats.total)
const adminUsers = computed(() => adminUsersStore.stats.admins)
const activeUsers = computed(() => adminUsersStore.stats.ativos)
const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const abrirModalInvite = () => {
  adminUsersStore.clearSuccess()
  adminUsersStore.clearError()
  modalInviteAberto.value = true
}

const abrirModalEdit = (user: AdminUserRecord) => {
  adminUsersStore.clearSuccess()
  adminUsersStore.clearError()
  usuarioSelecionado.value = user
  modalEditAberto.value = true
}

const handleInvited = async (payload: AdminInviteUserPayload) => {
  const success = await adminUsersStore.inviteUser(payload)
  if (success) {
    modalInviteAberto.value = false
  }
}

const handleEditSaved = async (payload: { auth_uid: string; role: AdminUpdateUserRolePayload['role'] }) => {
  const user = await adminUsersStore.updateUserRole(payload.auth_uid, { role: payload.role })
  if (user) {
    modalEditAberto.value = false
  }
}

const handleDeleteUser = async (authUid: string) => {
  const success = await adminUsersStore.deleteUser(authUid)
  if (success) {
    modalEditAberto.value = false
    await carregarUsuarios()
  }
}

const handleResetPassword = async (authUid: string) => {
  await adminUsersStore.resetUserPassword(authUid)
  if (adminUsersStore.successMessage) {
    modalEditAberto.value = false
  }
}

const handleToggleStatus = async (user: AdminUserRecord) => {
  const nextStatus: Exclude<AdminUserStatus, 'pendente'> = user.status === 'inativo' ? 'ativo' : 'inativo'
  await adminUsersStore.updateUserStatus(user.auth_uid, { status: nextStatus })
  await carregarUsuarios()
}

const carregarUsuarios = async (pageOverride?: number) => {
  const query: AdminUsersListQuery = {
    search: busca.value,
    status: statusFiltro.value,
    sort_by: sortBy.value,
    sort_dir: sortDir.value,
    page: pageOverride || adminUsersStore.page,
    page_size: adminUsersStore.pageSize,
  }

  await adminUsersStore.fetchUsuarios(query)
}

const aplicarFiltros = async () => {
  adminUsersStore.clearSuccess()
  await carregarUsuarios(1)
}

const mudarPageSize = async (value: string) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return
  }

  adminUsersStore.pageSize = parsed
  await carregarUsuarios(1)
}

const irPaginaAnterior = async () => {
  if (adminUsersStore.page <= 1) {
    return
  }

  await carregarUsuarios(adminUsersStore.page - 1)
}

const irProximaPagina = async () => {
  if (adminUsersStore.page >= adminUsersStore.totalPages) {
    return
  }

  await carregarUsuarios(adminUsersStore.page + 1)
}

onMounted(async () => {
  if (!authStore.profile) {
    await authStore.getMe()
  }

  await carregarUsuarios(1)
})
</script>

<template>
  <AppPageShell
    eyebrow="Painel Administrativo"
    title="Controle de Usuários"
    description="Gerencie os colaboradores com acesso ao sistema de Notas Zincão."
  >
    <template #headerAside>
      <Botao variant="primary" class="flex items-center gap-2" @click="abrirModalInvite">
        <UserPlus class="w-4 h-4" />
        <span>Convidar Usuário</span>
      </Botao>
    </template>

    <div class="mt-6 space-y-6">
      <!-- Cards Informativos -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding-class="p-5">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Users class="w-5 h-5" />
            </div>
            <div>
              <span class="text-2xl font-black text-slate-900 dark:text-white">{{ totalUsers }}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total de Usuários</span>
            </div>
          </div>
        </Card>

        <Card padding-class="p-5">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
              <span class="text-2xl font-black text-slate-900 dark:text-white">{{ adminUsers }}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Administradores</span>
            </div>
          </div>
        </Card>

        <Card padding-class="p-5">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
              <UserCheck class="w-5 h-5" />
            </div>
            <div>
              <span class="text-2xl font-black text-slate-900 dark:text-white">{{ activeUsers }}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Contas Ativas</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Barra de Busca e Filtros -->
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center relative w-full max-w-md">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            v-model="busca"
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            class="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            @keyup.enter="aplicarFiltros"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="statusFiltro"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="pendente">Pendente</option>
          </select>

          <select
            v-model="sortBy"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="membro_desde">Ordenar por data</option>
            <option value="nome">Ordenar por nome</option>
            <option value="email">Ordenar por e-mail</option>
            <option value="status">Ordenar por status</option>
            <option value="role">Ordenar por permissão</option>
          </select>

          <select
            v-model="sortDir"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>

          <Botao variant="secondary" @click="aplicarFiltros">Filtrar</Botao>
        </div>
      </div>

      <!-- Tabela -->
      <UserManagementTable
        :usuarios="adminUsersStore.usuarios"
        :loading="adminUsersStore.loadingUsuarios"
        @edit-role="abrirModalEdit"
        @toggle-status="handleToggleStatus"
      />

      <Card class="flex flex-wrap items-center justify-between gap-4 text-sm" padding-class="px-4 py-3">
        <p class="text-slate-600 dark:text-slate-300">
          Página {{ adminUsersStore.page }} de {{ adminUsersStore.totalPages }} · {{ adminUsersStore.totalItems }} usuários
        </p>

        <div class="flex items-center gap-2">
          <select
            :value="String(adminUsersStore.pageSize)"
            class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            @change="mudarPageSize(($event.target as HTMLSelectElement).value)"
          >
            <option value="20">20 / página</option>
            <option value="50">50 / página</option>
            <option value="100">100 / página</option>
          </select>

          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            :disabled="adminUsersStore.loadingUsuarios || adminUsersStore.page <= 1"
            @click="irPaginaAnterior"
          >
            Anterior
          </button>

          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            :disabled="adminUsersStore.loadingUsuarios || adminUsersStore.page >= adminUsersStore.totalPages"
            @click="irProximaPagina"
          >
            Próxima
          </button>
        </div>
      </Card>

      <div
        v-if="adminUsersStore.successMessage"
        class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-500/10 dark:text-green-300"
      >
        {{ adminUsersStore.successMessage }}
      </div>

      <div
        v-if="adminUsersStore.errorMessage"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300"
      >
        {{ adminUsersStore.errorMessage }}
      </div>
    </div>

    <InviteUserModal 
      v-model="modalInviteAberto" 
      :loading="adminUsersStore.savingUsuario"
      :error-message="adminUsersStore.errorMessage"
      :success-message="adminUsersStore.successMessage"
      @invited="handleInvited"
    />
    
    <EditUserModal 
      v-model="modalEditAberto" 
      :usuario="usuarioSelecionado"
      :loading="adminUsersStore.savingUsuario"
      :error-message="adminUsersStore.errorMessage"
      @saved="handleEditSaved"
      @deleted="handleDeleteUser"
      @reset-password="handleResetPassword"
    />
  </AppPageShell>
</template>
