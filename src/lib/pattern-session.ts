import { createEmptyStep } from '@/lib/blank-song'
import type { Pattern } from '@/lib/types'
import { MAX_PATTERN_LENGTH, MIN_PATTERN_LENGTH } from '@/lib/types'

export const PATTERN_LENGTH_OPTIONS = [16, 32, 64, 128] as const

export function clampPatternLength(length: number): number {
  const rounded = Math.round(length / MIN_PATTERN_LENGTH) * MIN_PATTERN_LENGTH
  return Math.min(MAX_PATTERN_LENGTH, Math.max(MIN_PATTERN_LENGTH, rounded))
}

export function resizePattern(pattern: Pattern, nextLength: number): Pattern {
  const length = clampPatternLength(nextLength)

  return {
    ...pattern,
    length,
    tracks: pattern.tracks.map((track) => {
      if (track.length === length) return track.map((step) => ({ ...step }))
      if (track.length > length) {
        return track.slice(0, length).map((step) => ({ ...step }))
      }
      return [
        ...track.map((step) => ({ ...step })),
        ...Array.from({ length: length - track.length }, () => createEmptyStep()),
      ]
    }),
  }
}

export function clampSongBpm(bpm: number): number {
  return Math.min(999, Math.max(20, Math.round(bpm)))
}
