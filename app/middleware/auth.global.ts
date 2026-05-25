export default defineNuxtRouteMiddleware(async (to) => {
  const { AppRoute, PublicRoutes } = useAppRoutes()
  const recoveryType = String(to.query.type || '').toLowerCase()
  const hasRecoveryHash = typeof to.hash === 'string' && (
    to.hash.includes('type=recovery')
    || to.hash.includes('access_token=')
    || to.hash.includes('refresh_token=')
  )
  const hasRecoveryParams = Boolean(recoveryType === 'recovery' || hasRecoveryHash)

  if (hasRecoveryParams && to.path !== AppRoute.redefinirSenha) {
    return navigateTo({
      path: AppRoute.redefinirSenha,
      query: to.query,
      hash: to.hash,
    })
  }

  const isPublicRoute = PublicRoutes.some(route => to.path === route)
  const session = await resolveAuthSessionForRoute()

  if (!session && !isPublicRoute) {
    return navigateTo(AppRoute.login)
  }

  if (session && to.path === AppRoute.login) {
    return navigateTo(AppRoute.home)
  }
})
