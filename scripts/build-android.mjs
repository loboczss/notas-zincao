import { spawnSync } from 'node:child_process'

process.env.NUXT_CAPACITOR_BUILD = '1'

const result = spawnSync('npx', ['nuxi', 'generate'], {
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
