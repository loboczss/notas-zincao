/// <reference types="@nuxtjs/color-mode" />
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/logomarca.ico' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
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
      exclude: ['/login', '/confirm'],
      saveRedirectToCookie: false,
    },
  },
  nitro: {
    hooks: {
      'rollup:before': (_nitro, rollupConfig) => {
        const output = rollupConfig.output
        if (!output || Array.isArray(output)) return
        if (output.inlineDynamicImports) {
          delete output.manualChunks
          return
        }

        const manualChunks = output.manualChunks
        output.manualChunks = (id, meta) => {
          const normalizedId = id.replace(/\\/g, '/')
          if (normalizedId.includes('/@nuxtjs/supabase/dist/runtime/server/services/')) {
            return 'supabase-server-services'
          }

          if (typeof manualChunks === 'function') {
            return manualChunks(id, meta)
          }
        }
      },
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
