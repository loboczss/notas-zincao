export default defineNuxtRouteMiddleware(async (to) => {
  const { AppRoute, PublicRoutes } = useAppRoutes()
  const isPublicRoute = PublicRoutes.some(route => to.path === route)
  const session = await resolveAuthSessionForRoute()

  if (!session && !isPublicRoute) {
    return navigateTo(AppRoute.login)
  }

  if (session && to.path === AppRoute.login) {
    return navigateTo(AppRoute.home)
  }
})
