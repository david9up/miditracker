import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const DEV_PORT = Number(process.env.DEV_PORT) || 5310

/** GitHub project site: https://<user>.github.io/<repo>/ */
function resolveBase(): string {
  if (process.env.DEPLOY_PAGES === 'true' || process.env.GITHUB_PAGES === 'true') {
    // Relative base survives project-site subpaths without hard-coding the repo name.
    return './'
  }
  return '/'
}

export default defineConfig({
  base: resolveBase(),
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
