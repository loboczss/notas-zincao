export default defineNuxtRouteMiddleware((to) => {
  const { AppRoute, PublicRoutes } = useAppRoutes()
  const session = useSupabaseSession()
  const isPublicRoute = PublicRoutes.some(route => to.path === route)

  if (!session.value && !isPublicRoute) {
    return navigateTo(AppRoute.login)
  }

  if (session.value && to.path === AppRoute.login) {
    return navigateTo(AppRoute.home)
  }
})
