export const AppRoute = {
  home: '/',
  login: '/login',
  confirm: '/confirm',
  notas: '/notas',
  estoque: '/estoque',
  cadastrarNota: '/cadastrar-nota',
  profile: '/profile',
  adminUsuarios: '/admin/usuarios',
  adminLixeira: '/admin/lixeira',
} as const

export const PublicRoutes = [
  AppRoute.login,
  AppRoute.confirm,
] as const

export const notaRetiradaRoute = (id: string | number) => `${AppRoute.notas}/${id}/retirada`

export const notaHistoricoRoute = (id: string | number) => `${AppRoute.notas}/${id}/historico`

export const getPageTitle = (path: string) => {
  if (path === AppRoute.home) return 'Dashboard'
  if (path === AppRoute.login) return 'Login'
  if (path === AppRoute.confirm) return 'Confirmacao de Conta'
  if (path === AppRoute.notas) return 'Notas de Retirada'
  if (path.startsWith(`${AppRoute.notas}/`) && path.endsWith('/retirada')) return 'Retirada da Nota'
  if (path.startsWith(`${AppRoute.notas}/`) && path.endsWith('/historico')) return 'Historico de Auditoria'
  if (path === AppRoute.estoque) return 'Estoque'
  if (path === AppRoute.cadastrarNota) return 'Cadastrar Nota'
  if (path === AppRoute.profile) return 'Perfil'
  if (path === AppRoute.adminUsuarios) return 'Usuarios'
  if (path === AppRoute.adminLixeira) return 'Lixeira de Auditoria'

  return 'Notas Zincao'
}
