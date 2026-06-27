import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { assessExportQuality, countFilledSteps, countMatchingReadbackSteps } from '@/lib/export/export-quality'
import { importMidiBuffer } from '@/lib/midi/import-midi'
import { validateSongExport } from '@/lib/export/validate-export'

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/game-corpus')

interface GameCorpusManifest {
  source: string
  count: number
  files: Array<{ file: string; source?: string }>
}

const manifest = JSON.parse(
  readFileSync(join(corpusDir, 'manifest.json'), 'utf8'),
) as GameCorpusManifest

function loadFixture(name: string): ArrayBuffer {
  const bytes = readFileSync(join(corpusDir, name))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('game MIDI import -> export', () => {
  it.each(manifest.files.map((entry) => entry.file))(
    'exports with tracker-lib round-trip for %s',
    async (filename) => {
      const { song, report } = importMidiBuffer(loadFixture(filename), undefined, {
        sourceFilename: filename,
      })

      expect(report.noteCount).toBeGreaterThan(0)
      expect(song.patterns.length).toBeGreaterThan(0)

      const validation = await validateSongExport(song, report)
      if (!validation.ok) {
        console.warn(filename, validation.errors)
      }
      expect(validation.ok).toBe(true)
      expect(validation.checks.every((check) => check.ok)).toBe(true)

      const quality = await assessExportQuality(song, report)
      expect(quality.songFilledSteps).toBe(report.noteCount)
      expect(quality.readbackParityOk).toBe(true)
      expect(quality.noteRetentionFromImport).toBe(1)
      expect(quality.zipValid).toBe(true)
      expect(quality.trackerLibChecksOk).toBe(true)
      expect(quality.issues).toEqual([])
    },
  )
})

describe('export quality metrics (spot checks)', () => {
  it('preserves every placed note through tracker-lib on doom-e1m1', async () => {
    const filename = '24-doom-e1m1.mid'
    const { song, report } = importMidiBuffer(loadFixture(filename), undefined, {
      sourceFilename: filename,
    })

    expect(countFilledSteps(song)).toBe(report.noteCount)
    expect(countMatchingReadbackSteps(song)).toBe(report.noteCount)

    const quality = await assessExportQuality(song, report)
    expect(quality.patternCount).toBeGreaterThan(1)
    expect(quality.zipEntryCount).toBeGreaterThan(quality.patternCount)
  })
})
