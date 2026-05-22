/// <reference types="@nuxtjs/color-mode" />
import { existsSync, readFileSync } from 'node:fs'

// https://nuxt.com/docs/api/configuration/nuxt-config
type CapacitorServerFile = {
  apiBaseUrl?: string
  url?: string
}

const normalizeHttpsUrl = (value?: string) => {
  const url = value?.trim().replace(/\/+$/, '')
  return url && url.startsWith('https://') ? url : ''
}

const readCapacitorApiBaseUrl = () => {
  const path = 'capacitor.server.json'
  if (!existsSync(path)) return ''

  const config = JSON.parse(readFileSync(path, 'utf8')) as CapacitorServerFile
  return normalizeHttpsUrl(config.apiBaseUrl || config.url)
}

const isCapacitorBuild = process.env.NUXT_CAPACITOR_BUILD === '1'
const apiBaseUrl = normalizeHttpsUrl(process.env.NUXT_PUBLIC_API_BASE_URL)
  || (isCapacitorBuild ? readCapacitorApiBaseUrl() : '')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: !isCapacitorBuild,
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
    public: {
      apiBaseUrl,
    },
  },
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/login',
      exclude: ['/login', '/confirm'],
      saveRedirectToCookie: false,
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: true,
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
