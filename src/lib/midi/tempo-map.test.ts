import { describe, expect, it } from 'vitest'
import { Midi } from '@tonejs/midi'
import { importMidiBuffer, createTestMidiBuffer } from '@/lib/midi/import-midi'
import { flattenPatterns, repartitionPatterns } from '@/lib/midi/pattern-split'
import {
  buildTempoMap,
  bpmToTempoFxValue,
  ticksToRow,
  TEMPO_FX_INDEX,
} from '@/lib/midi/tempo-map'
import { createEmptyPattern } from '@/lib/blank-song'

describe('tempo-map', () => {
  it('maps MIDI ticks to tracker rows at 4 rows per beat', () => {
    expect(ticksToRow(480, 480)).toBe(4)
    expect(ticksToRow(960, 480)).toBe(8)
  })

  it('clamps tracker tempo FX values', () => {
    expect(bpmToTempoFxValue(240)).toBe(200)
    expect(bpmToTempoFxValue(60)).toBe(60)
  })

  it('builds tempo map entries with split markers', () => {
    const map = buildTempoMap(
      [
        { ticks: 0, bpm: 120 },
        { ticks: 480, bpm: 90 },
      ],
      480,
    )

    expect(map).toHaveLength(2)
    expect(map[1]?.patternSplit).toBe(true)
    expect(map[1]?.row).toBe(4)
  })
})

describe('pattern-split', () => {
  it('splits patterns at tempo change rows', () => {
    const pattern = createEmptyPattern('Pattern 01', 64)
    const split = repartitionPatterns([pattern], [32])

    expect(split.length).toBe(2)
    expect(split[0]?.length).toBeGreaterThanOrEqual(32)
    expect(split[1]?.length).toBeGreaterThanOrEqual(16)
  })

  it('flattens multiple patterns before splitting', () => {
    const parts = [createEmptyPattern('A', 32), createEmptyPattern('B', 32)]
    const flat = flattenPatterns(parts)
    expect(flat.length).toBe(64)
  })
})

describe('importMidiBuffer tempo', () => {
  it('places tempo FX on track 1 when MIDI tempo changes', () => {
    const midi = new Midi()
    midi.header.setTempo(120)
    midi.header.tempos.push({ ticks: 480, bpm: 96 })
    midi.header.update()

    const track = midi.addTrack()
    track.channel = 0
    track.addNote({
      midi: 60,
      ticks: 0,
      durationTicks: 960,
      velocity: 0.9,
    })
    track.addNote({
      midi: 64,
      ticks: 960,
      durationTicks: 480,
      velocity: 0.9,
    })

    const bytes = midi.toArray()
    const buffer = new Uint8Array(bytes).buffer
    const { song, report } = importMidiBuffer(buffer)

    expect(report.tempoMap.length).toBeGreaterThanOrEqual(2)
    expect(report.tempoFxPlaced).toBeGreaterThanOrEqual(1)

    const tempoStep = song.patterns.flatMap((p) => p.tracks[0] ?? []).find(
      (step) => step.fx1Type === TEMPO_FX_INDEX || step.fx2Type === TEMPO_FX_INDEX,
    )
    expect(tempoStep).toBeTruthy()
    expect(bpmToTempoFxValue(96)).toBe(96)
  })

  it('imports simple buffer unchanged in note count', () => {
    const { report } = importMidiBuffer(createTestMidiBuffer())
    expect(report.noteCount).toBe(3)
    expect(report.tempoMap[0]?.bpm).toBe(120)
  })
})
