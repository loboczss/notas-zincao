import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync } from 'fs'

type CapacitorServerFile = {
  apiBaseUrl?: string
  liveReloadUrl?: string
  url?: string
}

const normalizeHttpsUrl = (value?: string) => {
  const url = value?.trim().replace(/\/+$/, '')
  return url && url.startsWith('https://') ? url : undefined
}

const readServerConfig = () => {
  const path = 'capacitor.server.json'
  if (!existsSync(path)) return {} as CapacitorServerFile

  return JSON.parse(readFileSync(path, 'utf8')) as CapacitorServerFile
}

const serverConfig = readServerConfig()
const liveReloadUrl = normalizeHttpsUrl(process.env.CAPACITOR_LIVE_RELOAD_URL || serverConfig.liveReloadUrl)
const apiBaseUrl = normalizeHttpsUrl(process.env.NUXT_PUBLIC_API_BASE_URL || serverConfig.apiBaseUrl || serverConfig.url)
const liveReloadHost = liveReloadUrl ? new URL(liveReloadUrl).hostname : undefined
const apiHost = apiBaseUrl ? new URL(apiBaseUrl).hostname : undefined

const config: CapacitorConfig = {
  appId: 'br.com.zincao.notas',
  appName: 'Notas Zincao',
  webDir: '.output/public',
  loggingBehavior: 'none',
  appendUserAgent: 'NotasZincaoAndroid',
  backgroundColor: '#f8fafc',
  android: {
    allowMixedContent: false,
    captureInput: true,
    loggingBehavior: 'none',
    minWebViewVersion: 80,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: false,
        androidScheme: 'https',
        allowNavigation: liveReloadHost ? [liveReloadHost] : [],
      }
    : {
        androidScheme: 'https',
        cleartext: false,
        allowNavigation: apiHost ? [apiHost] : [],
      },
}

export default config
