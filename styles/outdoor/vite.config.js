import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'
import { watch } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MONOREPO_ROOT = resolve(__dirname, '../..')

export default defineConfig({
  plugins: [vue(), buildOutdoorPlugin()],
  resolve: {
    alias: {
      '/styles': resolve(MONOREPO_ROOT, 'styles'),
    },
  },
  server: {
    port: 11000,
    fs: {
      allow: [MONOREPO_ROOT],
    },
  },
})

function buildOutdoorPlugin() {
  const buildScript = resolve(__dirname, 'build-outdoor.mjs')
  const libertyBase = resolve(MONOREPO_ROOT, 'styles/liberty/style.json')

  function runBuild() {
    try {
      const out = execSync(`node "${buildScript}"`, { encoding: 'utf8' })
      console.log(out.trim())
    } catch (err) {
      console.error('build-outdoor error:', err.stderr?.trim() || err.message)
    }
  }

  let lastMtime = 0
  let pending = false

  function debouncedWatch(file) {
    watch(file, () => {
      const mtime = new Date().getTime()
      if (mtime - lastMtime < 500) return // debounce
      lastMtime = mtime
      if (pending) return
      pending = true
      setTimeout(() => {
        pending = false
        console.log(`\n  changed: ${file.replace(process.cwd(), '.')}`)
        runBuild()
        server.ws.send({ type: 'full-reload' })
      }, 300)
    })
  }

  let server

  return {
    name: 'build-outdoor',
    configureServer(srv) {
      server = srv
      runBuild()
      for (const file of [buildScript, libertyBase]) {
        debouncedWatch(file)
      }
    },
  }
}
