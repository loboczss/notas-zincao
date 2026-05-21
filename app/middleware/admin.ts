export default defineNuxtRouteMiddleware(async () => {
  const { AppRoute } = useAppRoutes()
  const authStore = useAuthStore()

  if (!authStore.profile) {
    await authStore.getMe()
  }

  const role = String(authStore.profile?.role || '').trim().toLowerCase()

  if (role !== 'admin') {
    return navigateTo(AppRoute.home)
  }
})
