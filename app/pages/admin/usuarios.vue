<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UserPlus, Search, Users, ShieldCheck, UserCheck } from 'lucide-vue-next'
import type {
  AdminInviteUserPayload,
  AdminUsersListQuery,
  AdminUsersSortBy,
  AdminUsersSortDir,
  AdminUpdateUserProfilePayload,
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

const handleEditSaved = async (payload: { auth_uid: string } & AdminUpdateUserProfilePayload) => {
  const user = await adminUsersStore.updateUserProfile(payload.auth_uid, {
    nome: payload.nome,
    role: payload.role,
  })
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
  <LayoutAppPageShell
    eyebrow="Painel Administrativo"
    title="Controle de usuarios"
    description="Gerencie os colaboradores com acesso ao sistema de Notas Zincao."
  >
    <template #headerAside>
      <Botao variant="primary" class="flex items-center gap-2" @click="abrirModalInvite">
        <UserPlus class="w-4 h-4" />
        <span>Convidar usuario</span>
      </Botao>
    </template>

    <div class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <PageStatCard label="Total de usuarios" :value="totalUsers">
          <template #icon>
            <Users class="h-5 w-5" />
          </template>
        </PageStatCard>

        <PageStatCard label="Administradores" :value="adminUsers" tone="indigo">
          <template #icon>
            <ShieldCheck class="h-5 w-5" />
          </template>
        </PageStatCard>

        <PageStatCard label="Contas ativas" :value="activeUsers" tone="emerald">
          <template #icon>
            <UserCheck class="h-5 w-5" />
          </template>
        </PageStatCard>
      </div>

      <PageToolbar>
        <div class="relative w-full lg:max-w-md">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            v-model="busca"
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            class="pl-10"
            @keyup.enter="aplicarFiltros"
          />
        </div>

        <template #actions>
          <SelectInput v-model="statusFiltro" class="w-full sm:w-auto">
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="pendente">Pendente</option>
          </SelectInput>

          <SelectInput v-model="sortBy" class="w-full sm:w-auto">
            <option value="membro_desde">Ordenar por data</option>
            <option value="nome">Ordenar por nome</option>
            <option value="email">Ordenar por e-mail</option>
            <option value="status">Ordenar por status</option>
            <option value="role">Ordenar por permissao</option>
          </SelectInput>

          <SelectInput v-model="sortDir" class="w-full sm:w-auto">
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </SelectInput>

          <Botao variant="secondary" @click="aplicarFiltros">Filtrar</Botao>
        </template>
      </PageToolbar>

      <AdminUserManagementTable
        :usuarios="adminUsersStore.usuarios"
        :loading="adminUsersStore.loadingUsuarios"
        @edit-role="abrirModalEdit"
        @toggle-status="handleToggleStatus"
      />

      <PagePagination
        :page="adminUsersStore.page"
        :total-pages="adminUsersStore.totalPages"
        :total-items="adminUsersStore.totalItems"
        :page-size="adminUsersStore.pageSize"
        :loading="adminUsersStore.loadingUsuarios"
        label="usuarios"
        @update:page-size="mudarPageSize"
        @previous="irPaginaAnterior"
        @next="irProximaPagina"
      />

    </div>

    <AdminInviteUserModal
      v-model="modalInviteAberto" 
      :loading="adminUsersStore.savingUsuario"
      :success-message="adminUsersStore.successMessage"
      @invited="handleInvited"
    />
    
    <AdminEditUserModal
      v-model="modalEditAberto" 
      :usuario="usuarioSelecionado"
      :loading="adminUsersStore.savingUsuario"
      @saved="handleEditSaved"
      @deleted="handleDeleteUser"
      @reset-password="handleResetPassword"
    />
  </LayoutAppPageShell>
</template>
