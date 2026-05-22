export default defineNuxtRouteMiddleware(async () => {
  const { AppRoute } = useAppRoutes()
  const session = await resolveAuthSessionForRoute()
  if (!session) return navigateTo(AppRoute.login)
})
