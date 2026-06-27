import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { importMidiBuffer } from '@/lib/midi/import-midi'
import { compareMidiImport } from '@/lib/midi/midi-compare'

const gameCorpusDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/game-corpus')

function loadGameFixture(name: string): ArrayBuffer {
  const bytes = readFileSync(join(gameCorpusDir, name))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('warcraft2-human2 import notes', () => {
  it('reports channel drops, quantize collisions, and unmapped FX from screenshot case', () => {
    const filename = '53-warcraft2-human2.mid'
    const buffer = loadGameFixture(filename)
    const { song, report } = importMidiBuffer(buffer, undefined, {
      sourceFilename: 'warcraft2-human2.mid',
    })
    const result = compareMidiImport(buffer, filename)

    expect(song.title).toBe('Flute')
    expect(report.sourceFilename).toBe('warcraft2-human2.mid')
    expect(report.patternCount).toBe(8)

    expect(report.droppedChannels).toBe(5)
    expect(report.droppedChannelNames).toEqual([
      'Ch2: Timpani',
      'Ch1: String Ensemble 1',
      'Ch4: String Ensemble 1',
      'Ch14: Oboe',
      'Ch6: Bassoon',
    ])

    expect(report.skippedNotes).toBe(95)
    expect(report.skippedFxEvents).toBe(33)
    expect(report.noteCount).toBeGreaterThan(0)

    expect(result.importedNoteCount).toBe(report.noteCount)
    expect(result.droppedNoteCount).toBeGreaterThan(0)
    expect(result.mismatches).toEqual([])
    expect(report.noteCount + report.skippedNotes).toBe(result.sourceNoteCount)
  })
})
