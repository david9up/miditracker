import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const DEV_PORT = Number(process.env.DEV_PORT) || 5310
const GITHUB_PAGES = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: GITHUB_PAGES ? '/miditracker/' : '/',
  plugins: [vue()],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: '127.0.0.1',
    port: DEV_PORT,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: DEV_PORT,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
