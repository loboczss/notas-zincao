import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync } from 'node:fs'

type CapacitorServerFile = {
  url?: string
}

const readServerUrl = () => {
  const path = 'capacitor.server.json'
  if (!existsSync(path)) return undefined

  const config = JSON.parse(readFileSync(path, 'utf8')) as CapacitorServerFile
  return config.url?.trim().replace(/\/+$/, '')
}

const rawServerUrl = readServerUrl()
const serverUrl = rawServerUrl && rawServerUrl.startsWith('https://') ? rawServerUrl : undefined
const serverHost = serverUrl ? new URL(serverUrl).hostname : undefined

const config: CapacitorConfig = {
  appId: 'br.com.zincao.notas',
  appName: 'Notas Zincao',
  webDir: 'native-shell',
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
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        androidScheme: 'https',
        allowNavigation: serverHost ? [serverHost] : [],
      }
    : {
        androidScheme: 'https',
        cleartext: false,
      },
}

export default config
