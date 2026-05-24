import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const localLibDirs = [
  join('android', 'capacitor-cordova-android-plugins', 'src', 'main', 'libs'),
  join('android', 'capacitor-cordova-android-plugins', 'libs'),
]

const hasLocalAndroidLibs = localLibDirs.some((dir) => {
  if (!existsSync(dir)) return false

  return readdirSync(dir, { withFileTypes: true }).some((entry) => {
    if (!entry.isFile()) return false
    return /\.(aar|jar)$/i.test(entry.name)
  })
})

const generatedBuildGradle = join('android', 'capacitor-cordova-android-plugins', 'build.gradle')

if (!existsSync(generatedBuildGradle) || hasLocalAndroidLibs) {
  process.exit(0)
}

const original = readFileSync(generatedBuildGradle, 'utf8')
const patched = original.replace(
  /\r?\n\s*flatDir\s*\{\s*\r?\n\s*dirs\s+['"]src\/main\/libs['"]\s*,\s*['"]libs['"]\s*\r?\n\s*\}/,
  '',
)

if (patched !== original) {
  writeFileSync(generatedBuildGradle, patched)
  console.log('Removed unused flatDir repository from generated Capacitor Cordova Gradle module.')
}
