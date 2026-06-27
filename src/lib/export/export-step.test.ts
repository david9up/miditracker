import { describe, expect, it } from 'vitest'
import { expectedStepEffects, readbackStepMatches, stepToTrackerStep } from '@/lib/export/export-step'
import { serializePattern } from '@/lib/export/export-tracker'
import { createEmptyStep } from '@/lib/blank-song'
import { parsePatternBuffer, writePatternBuffer } from '@/lib/export/tracker-lib-io'
import { createTestMidiBuffer, importMidiBuffer } from '@/lib/midi/import-midi'
import Tracker from '@polyend/tracker-lib'

describe('export-step readback', () => {
  it('preserves volume FX through tracker-lib round-trip', () => {
    const step = createEmptyStep()
    step.note = 60
    step.instrument = 49
    step.volume = 64

    const pattern = Tracker.createPattern(8, 16)
    pattern.tracks[0]!.steps[0] = stepToTrackerStep(step)
    const read = parsePatternBuffer(writePatternBuffer(pattern)).tracks[0]!.steps[0]!

    expect(readbackStepMatches(step, read)).toBeNull()
    expect(expectedStepEffects(step).volume).toBe(64)
  })

  it('preserves custom FX slots when they fit in two lanes', () => {
    const step = createEmptyStep()
    step.note = 62
    step.instrument = 50
    step.fx1Type = 8
    step.fx1Value = 42

    const pattern = Tracker.createPattern(8, 16)
    pattern.tracks[0]!.steps[0] = stepToTrackerStep(step)
    const read = parsePatternBuffer(writePatternBuffer(pattern)).tracks[0]!.steps[0]!

    expect(readbackStepMatches(step, read)).toBeNull()
  })
})

describe('validateSongExport FX/volume on imported MIDI', () => {
  it('round-trips steps with volume on game fixture', async () => {
    const { song } = importMidiBuffer(createTestMidiBuffer({
      controlChanges: [{ ticks: 0, number: 7, value: 80 }],
      notes: [{ midi: 60, ticks: 0, velocity: 90 }],
    }))

    const pattern = song.patterns[0]!
    const step = pattern.tracks[0]?.[0]
    expect(step?.volume).toBeGreaterThan(0)

    const readback = parsePatternBuffer(serializePattern(pattern))
    const readStep = readback.tracks[0]?.steps[0]
    expect(readStep).toBeDefined()
    expect(readbackStepMatches(step!, readStep!)).toBeNull()
  })
})
