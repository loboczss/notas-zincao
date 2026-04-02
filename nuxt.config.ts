/// <reference types="@nuxtjs/color-mode" />
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/logomarca.ico' },
      ],
    },
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    // @ts-ignore
    ['@nuxtjs/color-mode', {
      classSuffix: '',
      preference: 'system',
      fallback: 'light',
    }],
  ],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/login',
      exclude: [],
      saveRedirectToCookie: false,
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'lucide-vue-next',
      ]
    }
  }
})