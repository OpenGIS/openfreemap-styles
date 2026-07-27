import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MONOREPO_ROOT = resolve(__dirname, '../..')

export default defineConfig({
  plugins: [vue()],
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
