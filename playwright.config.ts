import { defineConfig, devices } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PORT = process.env.MIDITRACKER_TEST_PORT ?? '5310'

function findChromiumForTesting(): string | undefined {
  const macArch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), 'Library/Caches/ms-playwright'),
  ].filter(Boolean) as string[]

  for (const root of roots) {
    try {
      const versions = readdirSync(root)
        .filter((name) => name.startsWith('chromium-'))
        .sort()
        .reverse()
      for (const version of versions) {
        const candidate = join(
          root,
          version,
          `chrome-mac-${macArch}`,
          'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        )
        if (existsSync(candidate)) return candidate
      }
    } catch {
      // try next root
    }
  }
  return undefined
}

const chromiumPath = findChromiumForTesting()

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    ...(chromiumPath
      ? { launchOptions: { executablePath: chromiumPath } }
      : { channel: 'chrome' }),
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.MIDITRACKER_NO_SERVER
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
