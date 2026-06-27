import { describe, expect, it } from 'vitest'
import { Midi } from '@tonejs/midi'
import { createTestMidiBuffer, importMidiBuffer } from '@/lib/midi/import-midi'
import { songToMidiBuffer } from '@/lib/export/export-midi'

describe('songToMidiBuffer', () => {
  it('exports placed notes from the grid as Standard MIDI', () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    const buffer = songToMidiBuffer(song)
    const midi = new Midi(buffer)

    expect(midi.tracks.length).toBeGreaterThan(0)
    expect(midi.tracks[0]?.notes.length).toBeGreaterThan(0)
  })

  it('round-trips chord stacks spread across adjacent rows', () => {
    const buffer = createTestMidiBuffer({
      notes: [
        { midi: 60, ticks: 0, durationTicks: 480 },
        { midi: 64, ticks: 0, durationTicks: 480 },
        { midi: 67, ticks: 0, durationTicks: 480 },
      ],
    })
    const { song, report } = importMidiBuffer(buffer)

    expect(report.noteCount).toBe(3)
    expect(report.skippedNotes).toBe(0)

    const exported = new Midi(songToMidiBuffer(song))
    const noteCount = exported.tracks.reduce((total, track) => total + track.notes.length, 0)
    expect(noteCount).toBe(3)
  })
})

describe('chord spill quantize', () => {
  it('places same-tick chord tones on adjacent rows within the beat', () => {
    const buffer = createTestMidiBuffer({
      notes: [
        { midi: 60, ticks: 0, durationTicks: 480 },
        { midi: 64, ticks: 0, durationTicks: 480 },
        { midi: 67, ticks: 0, durationTicks: 480 },
      ],
    })
    const { song, report } = importMidiBuffer(buffer)
    const track = song.patterns[0]!.tracks[0]!

    expect(report.skippedNotes).toBe(0)
    expect(track[0]?.note).toBe(60)
    expect(track[1]?.note).toBe(64)
    expect(track[2]?.note).toBe(67)
  })
})
