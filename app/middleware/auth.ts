export default defineNuxtRouteMiddleware(() => {
  const { AppRoute } = useAppRoutes()
  const session = useSupabaseSession()
  if (!session.value) return navigateTo(AppRoute.login)
})
