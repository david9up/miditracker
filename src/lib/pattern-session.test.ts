import { describe, expect, it } from 'vitest'
import { soundfontNameForProgram } from '@/lib/gm-soundfont'
import { clampPatternLength, clampSongBpm, resizePattern } from '@/lib/pattern-session'
import { createEmptyPattern } from '@/lib/blank-song'

describe('gm-soundfont mapping', () => {
  it('maps GM programs to FluidR3 instrument names', () => {
    expect(soundfontNameForProgram(0)).toBe('acoustic_grand_piano')
    expect(soundfontNameForProgram(128)).toBe('synth_drum')
  })
})

describe('pattern-session', () => {
  it('clamps pattern length to tracker limits', () => {
    expect(clampPatternLength(10)).toBe(16)
    expect(clampPatternLength(200)).toBe(128)
  })

  it('resizes patterns without losing existing steps', () => {
    const pattern = createEmptyPattern('Test', 64)
    pattern.tracks[0]![0]!.note = 60
    const shorter = resizePattern(pattern, 32)
    expect(shorter.length).toBe(32)
    expect(shorter.tracks[0]![0]!.note).toBe(60)

    const longer = resizePattern(shorter, 64)
    expect(longer.length).toBe(64)
    expect(longer.tracks[0]![0]!.note).toBe(60)
    expect(longer.tracks[0]![63]!.note).toBe(-1)
  })

  it('clamps song bpm', () => {
    expect(clampSongBpm(12)).toBe(20)
    expect(clampSongBpm(140.4)).toBe(140)
  })
})
