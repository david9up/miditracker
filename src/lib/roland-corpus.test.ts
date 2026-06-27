import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { importMidiBuffer } from '@/lib/midi/import-midi'
import { validateSongExport } from '@/lib/export/validate-export'

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/roland-corpus')

const corpusFiles = [
  'arena-dungeon1.mid',
  'discworld-alley.mid',
  'space-quest-v-starcon-academy.mid',
]

function loadFixture(name: string): ArrayBuffer {
  const bytes = readFileSync(join(corpusDir, name))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('roland-corpus fixtures', () => {
  it.each(corpusFiles)('imports and validates %s', async (filename) => {
    const { song, report } = importMidiBuffer(loadFixture(filename))

    expect(report.noteCount).toBeGreaterThan(0)
    expect(song.patterns.length).toBeGreaterThan(0)
    expect(song.instruments.length).toBeGreaterThan(0)

    const validation = await validateSongExport(song, report)
    expect(validation.checks.find((check) => check.id === 'patterns')?.ok).toBe(true)
    expect(validation.checks.find((check) => check.id === 'project')?.ok).toBe(true)
  })
})
