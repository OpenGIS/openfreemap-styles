#!/usr/bin/env node

/**
 * Watch scripts/build.mjs and styles/liberty/style.json for changes
 * and re-run the build automatically.
 *
 * Usage:
 *   node scripts/watch.mjs
 *
 * Designed to run alongside `vite` (e.g. via `concurrently`).
 * When build rewrites style.json, Vite's HMR picks it up.
 */

import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const buildScript = resolve(__dirname, 'build.mjs')
const libertyStyle = resolve(__dirname, '..', '..', '..', 'styles', 'liberty', 'style.json')

// ── Debounce — macOS FSEvents can fire multiple times per save ──

let timeout = null
const DEBOUNCE_MS = 200

function runBuild() {
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => {
    timeout = null
    const child = spawn('node', [buildScript], {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    })
    child.on('error', (err) => console.error('[watch] build failed:', err.message))
  }, DEBOUNCE_MS)
}

// ── Watch ──

for (const target of [buildScript, libertyStyle]) {
  watch(target, (eventType) => {
    console.log(`[watch] ${eventType}: ${target}`)
    runBuild()
  })
}

console.log('[watch] watching build.mjs + liberty/style.json for changes…')
