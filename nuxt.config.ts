/// <reference types="@nuxtjs/color-mode" />
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
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
      callback: '/confirm',
      exclude: ['/politica'],
      saveRedirectToCookie: false,
    },
  },
})