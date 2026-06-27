import { describe, expect, it } from 'vitest'
import { createEmptyStep } from '@/lib/blank-song'
import { applyHexDigit, moveEditColumn, semitoneToNote } from '@/lib/pattern-edit'

describe('pattern-edit', () => {
  it('maps semitones to MIDI notes for an octave', () => {
    expect(semitoneToNote(0, 4)).toBe(60)
    expect(semitoneToNote(12, 4)).toBe(72)
  })

  it('applies hex instrument values', () => {
    const step = createEmptyStep()
    const result = applyHexDigit(step, 'instrument', '', '3')
    expect(result.advance).toBe(false)
    const done = applyHexDigit(step, 'instrument', result.buffer, '1')
    expect(done.advance).toBe(true)
    expect(step.instrument).toBe(0x31)
  })

  it('advances edit columns with tab direction', () => {
    expect(moveEditColumn('note', 1)).toBe('instrument')
    expect(moveEditColumn('instrument', -1)).toBe('note')
  })
})
