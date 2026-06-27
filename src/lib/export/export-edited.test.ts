import { describe, expect, it } from 'vitest'
import { createBlankSong, createEmptyStep } from '@/lib/blank-song'
import { setNoteOnStep } from '@/lib/pattern-edit'
import { resizePattern, clampSongBpm } from '@/lib/pattern-session'
import { appendSongOrderSlot } from '@/lib/song-order'
import { importMidiBuffer, createTestMidiBuffer } from '@/lib/midi/import-midi'
import { validateSongExport } from '@/lib/export/validate-export'
import { cloneSong } from '@/lib/clone-song'

describe('export edited songs', () => {
  it('exports a blank new project', async () => {
    const song = createBlankSong()
    const result = await validateSongExport(song)

    expect(result.ok).toBe(true)
    expect(result.checks.every((check) => check.ok)).toBe(true)
  })

  it('exports after manual note edits', async () => {
    const song = createBlankSong()
    const step = song.patterns[0]!.tracks[0]![0]!
    setNoteOnStep(step, 60)
    step.instrument = 49
    step.volume = 72

    const result = await validateSongExport(song)
    expect(result.ok).toBe(true)
  })

  it('exports after BPM and pattern length edits on imported song', async () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    song.bpm = clampSongBpm(140)
    song.patterns[0] = resizePattern(song.patterns[0]!, 32)

    const result = await validateSongExport(song)
    expect(result.ok).toBe(true)
  })

  it('exports after song order duplication', async () => {
    const { song, report } = importMidiBuffer(createTestMidiBuffer())
    const edited = cloneSong(song)
    edited.songOrder = appendSongOrderSlot(edited.songOrder, 0)

    const result = await validateSongExport(edited, report)
    expect(result.ok).toBe(true)
    expect(result.checks.find((check) => check.id === 'project')?.ok).toBe(true)
  })

  it('exports steps with volume and FX edits', async () => {
    const song = createBlankSong()
    const step = createEmptyStep()
    setNoteOnStep(step, 64)
    step.instrument = 52
    step.volume = 55
    step.fx1Type = 8
    step.fx1Value = 17
    song.patterns[0]!.tracks[1]![4] = step

    const result = await validateSongExport(song)
    expect(result.ok).toBe(true)
  })
})
