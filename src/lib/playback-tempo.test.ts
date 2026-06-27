import { describe, expect, it } from 'vitest'
import { createBlankSong } from '@/lib/blank-song'
import { TEMPO_FX_INDEX } from '@/lib/midi/tempo-map'
import {
  bpmFromTempoMapAtRow,
  globalRowForPosition,
  programChangeFromStep,
  rowDurationMs,
  tempoFxBpmFromStep,
} from '@/lib/playback-tempo'
import { PROGRAM_CHANGE_FX_INDEX } from '@/lib/midi/midi-fx'

describe('playback tempo', () => {
  it('computes global row across song order', () => {
    const song = createBlankSong()
    song.patterns[0]!.length = 32
    song.patterns.push({ ...song.patterns[0]!, name: 'Pattern 02', length: 16 })
    song.songOrder = [0, 1]

    expect(globalRowForPosition(song, 0, 10)).toBe(10)
    expect(globalRowForPosition(song, 1, 4)).toBe(36)
  })

  it('reads BPM from tempo map at row', () => {
    const song = createBlankSong()
    song.bpm = 120
    song.tempoMap = [
      { row: 0, ticks: 0, bpm: 120, patternSplit: false },
      { row: 64, ticks: 0, bpm: 140, patternSplit: true },
    ]

    expect(bpmFromTempoMapAtRow(song, 32)).toBe(120)
    expect(bpmFromTempoMapAtRow(song, 80)).toBe(140)
  })

  it('reads T FX tempo from track 1 step', () => {
    const step = {
      note: -1,
      instrument: 0,
      volume: 0,
      fx1Type: TEMPO_FX_INDEX,
      fx1Value: 150,
      fx2Type: 0,
      fx2Value: 0,
    }
    expect(tempoFxBpmFromStep(step)).toBe(150)
  })

  it('reads program change FX from step', () => {
    const step = {
      note: 60,
      instrument: 49,
      volume: 72,
      fx1Type: PROGRAM_CHANGE_FX_INDEX,
      fx1Value: 42,
      fx2Type: 0,
      fx2Value: 0,
    }
    expect(programChangeFromStep(step)).toBe(42)
  })

  it('uses 4 rows per beat duration', () => {
    expect(rowDurationMs(120)).toBe(125)
  })
})
