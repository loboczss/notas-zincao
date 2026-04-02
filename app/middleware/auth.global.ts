export default defineNuxtRouteMiddleware((to) => {
  const session = useSupabaseSession()

  if (!session.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (session.value && to.path === '/login') {
    return navigateTo('/')
  }
})
