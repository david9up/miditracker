import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compareMidiImport } from '@/lib/midi/midi-compare'
import { extractMidiReference } from '@/lib/midi/midi-reference'
import { createTestMidiBuffer } from '@/lib/midi/import-midi'

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/midi-corpus')

interface CorpusManifest {
  seed: number
  count: number
  files: Array<{ file: string; source?: string }>
}

const manifest = JSON.parse(
  readFileSync(join(corpusDir, 'manifest.json'), 'utf8'),
) as CorpusManifest

const corpusFiles = manifest.files.map((entry) => entry.file)

function loadFixture(name: string): ArrayBuffer {
  const bytes = readFileSync(join(corpusDir, name))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function expectCorpusParity(filename: string): void {
  const result = compareMidiImport(loadFixture(filename), filename)

  expect(result.reference.tonejsNoteCount).toBeGreaterThan(0)
  expect(result.report.noteCount).toBeGreaterThan(0)
  expect(result.report.ppq).toBe(result.reference.ppq)

  if (result.report.droppedChannels === 0) {
    expect(result.sourceNoteCount).toBe(result.reference.tonejsNoteCount)
    expect(result.report.channelsUsed).toBe(result.reference.channelsWithNotes.length)
  } else {
    expect(result.droppedNoteCount).toBeGreaterThan(0)
  }

  expect(result.importedNoteCount + result.report.skippedNotes).toBe(result.sourceNoteCount)

  if (result.mismatches.length > 0) {
    console.warn(`${filename} mismatches:`, result.mismatches)
  }
  expect(result.mismatches).toEqual([])
}

describe('midi-reference extractor', () => {
  it('matches synthetic test MIDI counts', () => {
    const buffer = createTestMidiBuffer()
    const profile = extractMidiReference(buffer)

    expect(profile.tonejsNoteCount).toBe(3)
    expect(profile.rawNoteOnCount).toBe(3)
    expect(profile.channelsWithNotes).toEqual([0])
    expect(profile.ppq).toBeGreaterThan(0)
  })
})

describe('pilot MIDI comparison (doom-e1m1)', () => {
  const filename = '00-pilot-doom-e1m1.mid'

  it('imports without structural mismatches vs reference parsers', () => {
    const result = compareMidiImport(loadFixture(filename), filename)

    expect(result.reference.tonejsNoteCount).toBeGreaterThan(0)
    expect(result.reference.rawNoteOnCount).toBe(result.reference.tonejsNoteCount)
    expect(result.sourceNoteCount).toBe(result.reference.tonejsNoteCount)
    expect(result.importedNoteCount + result.report.skippedNotes).toBe(result.sourceNoteCount)
    expect(result.report.ppq).toBe(result.reference.ppq)
    expect(result.report.channelsUsed).toBe(4)
    expect(result.mismatches).toEqual([])
    expect(result.ok).toBe(true)
  })
})

describe(`midi-corpus comparison (${manifest.count} random Roland files, seed ${manifest.seed})`, () => {
  it.each(corpusFiles)('reference parity for %s', (filename) => {
    expectCorpusParity(filename)
  })
})

describe('>8 note channels', () => {
  const filename = '13-ff7_105.mid'

  it('drops lowest-priority note channels beyond the 8-track limit', () => {
    const result = compareMidiImport(loadFixture(filename), filename)

    expect(result.reference.channelsWithNotes.length).toBeGreaterThan(8)
    expect(result.report.channelsUsed).toBe(8)
    expect(result.report.droppedChannels).toBeGreaterThan(0)
    expect(result.droppedNoteCount).toBeGreaterThan(0)
    expect(result.sourceNoteCount + result.droppedNoteCount).toBe(
      result.reference.tonejsNoteCount,
    )
    expect(result.importedNoteCount + result.report.skippedNotes).toBe(result.sourceNoteCount)
    expect(result.mismatches).toEqual([])
  })
})
