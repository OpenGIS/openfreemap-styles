#!/usr/bin/env node

/**
 * Build outdoor POI vector tiles using Planetiler.
 *
 * Downloads the Planetiler JAR if not present, then runs
 * `generate-custom` with the YAML schema to produce a .pmtiles file.
 *
 * Usage:
 *   node scripts/build.mjs
 *   node scripts/build.mjs --bounds=10.48,45.27,11.78,46.18
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const JAR_DIR = resolve(ROOT, '.planetiler')
const JAR_PATH = resolve(JAR_DIR, 'planetiler.jar')
const SCHEMA_PATH = resolve(ROOT, 'schema.yml')
const OUTPUT_PATH = resolve(ROOT, 'outdoor_pois.pmtiles')

const PLANETILER_DOWNLOAD_URL =
  'https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar'

// Default bounds — Venetian Prealps, NE Italy (~50km around 45.723, 11.128)
const DEFAULT_BOUNDS = '10.48,45.27,11.78,46.18'

function getBounds() {
  const arg = process.argv.find(a => a.startsWith('--bounds='))
  return arg ? arg.split('=')[1] : DEFAULT_BOUNDS
}

function checkJava() {
  try {
    const out = execSync('java -version 2>&1', { encoding: 'utf8' })
    const match = out.match(/(\d+)\./)
    if (!match || parseInt(match[1]) < 21) {
      console.error('✗ JDK 21+ required. Found:')
      console.error(out.trim().split('\n')[0])
      process.exit(1)
    }
    console.log(`✓ ${out.trim().split('\n')[0]}`)
  } catch {
    console.error('✗ Java not found. Install JDK 21+: https://adoptium.net')
    process.exit(1)
  }
}

function downloadJar() {
  if (existsSync(JAR_PATH)) {
    console.log(`✓ Planetiler JAR already at ${JAR_PATH}`)
    return
  }

  console.log('↓ Downloading Planetiler JAR...')
  mkdirSync(JAR_DIR, { recursive: true })

  try {
    execSync(`curl -#L -o "${JAR_PATH}" "${PLANETILER_DOWNLOAD_URL}"`, {
      stdio: 'inherit',
      timeout: 120_000,
    })
    console.log('✓ Planetiler JAR downloaded')
  } catch (err) {
    console.error('✗ Failed to download Planetiler JAR:', err.message)
    process.exit(1)
  }
}

function build() {
  const bounds = getBounds()
  console.log(`  schema: ${SCHEMA_PATH}`)
  console.log(`  output: ${OUTPUT_PATH}`)
  console.log(`  bounds: ${bounds}`)
  console.log()

  const cmd = [
    `java -jar "${JAR_PATH}"`,
    'generate-custom',
    `--schema="${SCHEMA_PATH}"`,
    `--output="${OUTPUT_PATH}"`,
    '--maxzoom=16',
    '--download',
    `--bounds=${bounds}`,
    '--quiet',
  ].join(' ')

  try {
    execSync(cmd, { stdio: 'inherit', timeout: 600_000 })
    console.log(`\n✓ Outdoor POI tiles written to ${OUTPUT_PATH}`)
  } catch (err) {
    console.error('\n✗ Planetiler build failed:', err.message)
    process.exit(1)
  }
}

console.log('═══ Outdoor POI Planetiler Build ═══')
console.log()
checkJava()
downloadJar()
build()
