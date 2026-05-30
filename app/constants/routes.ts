export const AppRoute = {
  home: '/',
  login: '/login',
  confirm: '/confirm',
  redefinirSenha: '/redefinir-senha',
  notas: '/notas',
  retiradas: '/retiradas',
  sincronizacao: '/sincronizacao',
  estoque: '/estoque',
  stockIntegrin: '/stock-integrin',
  cadastrarNota: '/cadastrar-nota',
  profile: '/profile',
  adminUsuarios: '/admin/usuarios',
  adminLixeira: '/admin/lixeira',
} as const

export const PublicRoutes = [
  AppRoute.login,
  AppRoute.confirm,
  AppRoute.redefinirSenha,
] as const

export const notaRetiradaRoute = (id: string | number) => `${AppRoute.notas}/${id}/retirada`

export const notaHistoricoRoute = (id: string | number) => `${AppRoute.notas}/${id}/historico`

export const getPageTitle = (path: string) => {
  if (path === AppRoute.home) return 'Dashboard'
  if (path === AppRoute.login) return 'Login'
  if (path === AppRoute.confirm) return 'Confirmacao de Conta'
  if (path === AppRoute.redefinirSenha) return 'Redefinir Senha'
  if (path === AppRoute.notas) return 'Notas de Retirada'
  if (path === AppRoute.retiradas) return 'Historico de Retiradas'
  if (path === AppRoute.sincronizacao) return 'Sincronizacao Offline'
  if (path.startsWith(`${AppRoute.notas}/`) && path.endsWith('/retirada')) return 'Retirada da Nota'
  if (path.startsWith(`${AppRoute.notas}/`) && path.endsWith('/historico')) return 'Historico de Auditoria'
  if (path === AppRoute.estoque) return 'Estoque'
  if (path === AppRoute.stockIntegrin) return 'Stock Integrin'
  if (path === AppRoute.cadastrarNota) return 'Cadastrar Nota'
  if (path === AppRoute.profile) return 'Perfil'
  if (path === AppRoute.adminUsuarios) return 'Usuarios'
  if (path === AppRoute.adminLixeira) return 'Lixeira de Auditoria'

  return 'Notas Zincao'
}
