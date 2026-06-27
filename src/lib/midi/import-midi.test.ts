import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createTestMidiBuffer, createMultiChannelTestMidiBuffer, importMidiBuffer, resolveImportTitle } from '@/lib/midi/import-midi'
import { compactInstrumentLabel } from '@/lib/gm-soundfont'
import { patternToTrackerData, serializePattern } from '@/lib/export/export-tracker'
import { compareMidiImport } from '@/lib/midi/midi-compare'
import { extractMidiReference } from '@/lib/midi/midi-reference'

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/midi-corpus')

function loadFixture(name: string): ArrayBuffer {
  const bytes = readFileSync(join(corpusDir, name))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('resolveImportTitle', () => {
  it('uses filename stem when MIDI metadata title is generic', () => {
    expect(resolveImportTitle('Imported MIDI', 'boss_fight.mid')).toEqual({
      title: 'boss_fight',
      sourceFilename: 'boss_fight.mid',
    })
  })

  it('keeps metadata title when present', () => {
    expect(resolveImportTitle('Final Stage', 'boss_fight.mid')).toEqual({
      title: 'Final Stage',
      sourceFilename: 'boss_fight.mid',
    })
  })
})

describe('compactInstrumentLabel', () => {
  it('removes channel prefix for grid display', () => {
    expect(compactInstrumentLabel('Ch5: Synth Brass 1')).toBe('Synth Brass 1')
    expect(compactInstrumentLabel('Acoustic Grand Piano')).toBe('Acoustic Grand Piano')
  })
})

describe('importMidiBuffer', () => {
  it('stores source filename on the import report', () => {
    const { report } = importMidiBuffer(createTestMidiBuffer(), undefined, {
      sourceFilename: 'test_song.mid',
    })
    expect(report.sourceFilename).toBe('test_song.mid')
  })

  it('converts a simple MIDI file into tracker patterns', () => {
    const buffer = createTestMidiBuffer()
    const { song, report } = importMidiBuffer(buffer)

    expect(report.noteCount).toBe(3)
    expect(report.channelsUsed).toBe(1)
    expect(song.patterns.length).toBeGreaterThan(0)
    expect(song.instruments[0]?.trackerSlot).toBe(48)
    expect(song.instruments[0]?.id).toBe(49)
  })

  it('drops channels beyond the 8-track limit', () => {
    const midi = createTestMidiBuffer({ channel: 0 })
    const { report } = importMidiBuffer(midi)
    expect(report.channelCount).toBe(8)
  })

  it('does not allocate tracks to CC-only channels when notes exist', () => {
    const { report } = importMidiBuffer(loadFixture('00-pilot-doom-e1m1.mid'))

    expect(report.channelsUsed).toBe(4)
    expect(report.droppedChannels).toBe(0)
    expect(report.channelMap.every((entry) => entry.noteCount > 0)).toBe(true)
    expect(report.noteCount).toBeGreaterThan(0)
  })

  it('keeps the 8 busiest note channels when more than 8 carry notes', () => {
    const channelSpecs = Array.from({ length: 10 }, (_, channel) => ({
      channel,
      noteCount: (10 - channel) * 2,
    }))
    const buffer = createMultiChannelTestMidiBuffer(channelSpecs)
    const reference = extractMidiReference(buffer)
    const { report } = importMidiBuffer(buffer)
    const result = compareMidiImport(buffer, 'ten-channels.mid')

    expect(reference.channelsWithNotes).toHaveLength(10)
    expect(report.channelsUsed).toBe(8)
    expect(report.droppedChannels).toBe(2)
    expect(report.droppedChannelNames).toHaveLength(2)

    const keptChannels = new Set(report.channelMap.map((entry) => entry.channel - 1))
    expect(keptChannels).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]))
    expect(keptChannels.has(8)).toBe(false)
    expect(keptChannels.has(9)).toBe(false)

    expect(result.droppedNoteCount).toBe(6)
    expect(result.sourceNoteCount).toBe(104)
    expect(result.sourceNoteCount + result.droppedNoteCount).toBe(reference.tonejsNoteCount)
    expect(report.noteCount + report.skippedNotes).toBe(result.sourceNoteCount)
    expect(result.mismatches).toEqual([])
  })
})

describe('export-tracker', () => {
  it('serializes patterns compatible with tracker-lib', () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    const pattern = song.patterns[0]!
    const data = patternToTrackerData(pattern)
    const buffer = serializePattern(pattern)

    expect(data.tracks.length).toBe(8)
    expect(data.tracks[0]?.steps.length).toBeGreaterThanOrEqual(pattern.length - 1)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })
})
