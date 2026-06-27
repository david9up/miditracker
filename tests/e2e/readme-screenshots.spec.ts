/** Run with: npm run screenshots */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = join(rootDir, 'docs/screenshots')
const doomFixture = join(rootDir, 'fixtures/midi-corpus/00-pilot-doom-e1m1.mid')

mkdirSync(outDir, { recursive: true })

const SCREENSHOT_CSS = `
  .status-bar { display: none !important; }
`

async function hideChrome(page: import('@playwright/test').Page) {
  await page.addStyleTag({ content: SCREENSHOT_CSS })
}

async function shotFromTopThrough(
  page: import('@playwright/test').Page,
  endLocator: import('@playwright/test').Locator,
  path: string,
  maxHeight = 900,
) {
  await endLocator.scrollIntoViewIfNeeded()
  await endLocator.waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(250)
  const endBox = await endLocator.boundingBox()
  if (!endBox) throw new Error('Could not measure screenshot region')
  const viewport = page.viewportSize()
  const width = viewport?.width ?? 1280
  await page.screenshot({
    path,
    animations: 'disabled',
    clip: {
      x: 0,
      y: 0,
      width,
      height: Math.min(endBox.y + endBox.height + 16, maxHeight),
    },
  })
}

const menuBar = (page: import('@playwright/test').Page) => page.locator('.menu-bar')

async function loadSample(page: import('@playwright/test').Page) {
  await menuBar(page).getByRole('button', { name: 'Sample', exact: true }).click()
  await page.locator('.pattern-editor__table').waitFor({ state: 'visible', timeout: 30_000 })
  await hideChrome(page)
}

async function loadMidiFile(page: import('@playwright/test').Page, filePath: string) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await menuBar(page).getByRole('button', { name: 'Load MIDI' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(filePath)
  await page.locator('.tracker-loading').waitFor({ state: 'detached', timeout: 90_000 })
  await page.locator('.session__seg-btn', { hasText: 'Import' }).waitFor({ state: 'visible', timeout: 90_000 })
  await hideChrome(page)
}

async function openSessionTab(page: import('@playwright/test').Page, label: string) {
  const handle = page.locator('.session__handle')
  const body = page.locator('.session__body')
  if (!(await body.isVisible())) {
    await handle.click()
  }
  await page.locator('.session__seg-btn', { hasText: label }).click()
  await body.waitFor({ state: 'visible', timeout: 15_000 })
}

test('capture README screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.goto('/')
  await page.locator('.pattern-editor__blank').waitFor({ state: 'visible', timeout: 15_000 })
  await hideChrome(page)
  await shotFromTopThrough(page, page.locator('.pattern-editor__blank'), join(outDir, 'blank-start.png'), 720)

  await loadSample(page)
  await shotFromTopThrough(page, page.locator('.pattern-editor'), join(outDir, 'main-overview.png'), 780)

  await page.locator('.pattern-editor__table').screenshot({
    path: join(outDir, 'grid-editing.png'),
    animations: 'disabled',
  })

  await page.goto('/')
  await loadMidiFile(page, doomFixture)
  await openSessionTab(page, 'Import')
  await page.locator('.import-pane').waitFor({ state: 'visible', timeout: 15_000 })
  await shotFromTopThrough(page, page.locator('.session__body'), join(outDir, 'session-import.png'), 860)

  await openSessionTab(page, 'Export')
  await page.locator('.validation-panel').waitFor({ state: 'visible', timeout: 15_000 })
  await shotFromTopThrough(page, page.locator('.session__body'), join(outDir, 'session-export.png'), 860)
})
