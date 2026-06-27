import { describe, expect, it } from 'vitest'
import {
  buildFxMappings,
  ccLabel,
  mappingForCc,
  mappingForProgramChange,
} from '@/lib/midi/midi-fx'
import { collectChannelMidiEvents, rankCcNumbers } from '@/lib/midi/midi-events'
import { createTestMidiBuffer, importMidiBuffer } from '@/lib/midi/import-midi'

describe('midi-fx', () => {
  it('maps frequent CC numbers to tracker slots and reserves PC', () => {
    const mappings = buildFxMappings({
      ccNumbers: [1, 7, 10, 64],
      hasProgramChanges: true,
    })

    expect(mappingForProgramChange(mappings)?.slot).toBe('f')
    expect(mappingForCc(mappings, 1)?.slot).toBe('a')
    expect(mappingForCc(mappings, 10)?.slot).toBe('b')
    expect(mappingForCc(mappings, 64)?.slot).toBe('c')
    expect(mappingForCc(mappings, 7)).toBeUndefined()
  })

  it('labels common controllers', () => {
    expect(ccLabel(7)).toBe('Volume')
    expect(ccLabel(99)).toBe('CC 99')
  })
})

describe('importMidiBuffer CC/PC', () => {
  it('maps CC events to tracker FX slots', () => {
    const buffer = createTestMidiBuffer({
      controlChanges: [
        { ticks: 0, number: 1, value: 64 },
        { ticks: 480, number: 10, value: 90 },
      ],
    })

    const events = collectChannelMidiEvents(buffer)
    expect(rankCcNumbers(events[0]?.controlChanges ?? [])).toEqual([1, 10])

    const { song, report } = importMidiBuffer(buffer)
    const step = song.patterns[0]?.tracks[0]?.[0]

    expect(report.ccEventCount).toBe(2)
    expect(report.mappedFxCount).toBeGreaterThan(0)
    expect(step?.fx1Type).toBeGreaterThan(0)
    expect(song.instruments[0]?.fxMapping.length).toBeGreaterThan(0)
  })

  it('maps CC7 to step volume and program changes to FX', () => {
    const buffer = createTestMidiBuffer({
      controlChanges: [{ ticks: 0, number: 7, value: 80 }],
      programChanges: [{ ticks: 480, program: 42 }],
    })

    const { song, report } = importMidiBuffer(buffer)
    const volumeStep = song.patterns[0]?.tracks[0]?.[0]
    const pcStep = song.patterns[0]?.tracks[0]?.[4]

    expect(report.programChangeCount).toBeGreaterThanOrEqual(1)
    expect(volumeStep?.volume).toBe(80)
    expect(pcStep?.fx1Type).toBe(37)
    expect(pcStep?.fx1Value).toBe(42)
  })
})
