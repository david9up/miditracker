import type { Pattern, Step } from '@/lib/types'
import { MAX_PATTERN_LENGTH, MIN_PATTERN_LENGTH, TRACK_COUNT } from '@/lib/types'
import { createEmptyStep } from '@/lib/blank-song'

function roundPatternLength(rowCount: number): number {
  const padded = Math.ceil(rowCount / MIN_PATTERN_LENGTH) * MIN_PATTERN_LENGTH
  return Math.min(MAX_PATTERN_LENGTH, Math.max(MIN_PATTERN_LENGTH, padded))
}

export function flattenPatterns(patterns: Pattern[]): { tracks: Step[][]; length: number } {
  const tracks: Step[][] = Array.from({ length: TRACK_COUNT }, () => [])
  let length = 0

  for (const pattern of patterns) {
    for (let trackIndex = 0; trackIndex < TRACK_COUNT; trackIndex++) {
      const source = pattern.tracks[trackIndex] ?? []
      tracks[trackIndex]!.push(...source)
    }
    length += pattern.length
  }

  return { tracks, length }
}

export function computePatternBoundaries(
  totalRows: number,
  tempoSplitRows: number[],
): number[] {
  const bounds = new Set<number>([0, totalRows])

  for (const row of tempoSplitRows) {
    if (row > 0 && row < totalRows) {
      bounds.add(row)
    }
  }

  for (let row = MAX_PATTERN_LENGTH; row < totalRows; row += MAX_PATTERN_LENGTH) {
    bounds.add(row)
  }

  return [...bounds].sort((a, b) => a - b)
}

export function sliceTimeline(
  tracks: Step[][],
  start: number,
  end: number,
): Step[][] {
  return tracks.map((track) => {
    const slice = track.slice(start, end)
    while (slice.length < MIN_PATTERN_LENGTH) {
      slice.push(createEmptyStep())
    }
    return slice
  })
}

export function repartitionPatterns(
  patterns: Pattern[],
  tempoSplitRows: number[],
): Pattern[] {
  if (patterns.length === 0) {
    return patterns
  }

  const { tracks, length } = flattenPatterns(patterns)
  if (length === 0) {
    return patterns
  }

  const boundaries = computePatternBoundaries(length, tempoSplitRows)
  const result: Pattern[] = []

  for (let index = 0; index < boundaries.length - 1; index++) {
    const start = boundaries[index]!
    const end = boundaries[index + 1]!
    const segmentLength = roundPatternLength(end - start)
    const segmentTracks = sliceTimeline(tracks, start, end).map((track) =>
      track.slice(0, segmentLength),
    )

    while (segmentTracks[0]!.length < segmentLength) {
      for (const track of segmentTracks) {
        track.push(createEmptyStep())
      }
    }

    const partNumber = result.length + 1
    const startRow = start + 1
    const endRow = end
    const name =
      boundaries.length <= 2
        ? 'Pattern 01'
        : `Part ${String(partNumber).padStart(2, '0')} (rows ${startRow}-${endRow})`

    result.push({
      name,
      length: segmentLength,
      tracks: segmentTracks,
    })
  }

  return result.length > 0 ? result : patterns
}

export function applyTempoFxAtRows(
  patterns: Pattern[],
  rows: Array<{ globalRow: number; bpm: number }>,
  applyFx: (patternIndex: number, rowInPattern: number, fxType: number, fxValue: number) => void,
  tempoFxIndex: number,
): number {
  let placed = 0
  let offset = 0

  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
    const pattern = patterns[patternIndex]!
    for (const entry of rows) {
      if (entry.globalRow >= offset && entry.globalRow < offset + pattern.length) {
        applyFx(
          patternIndex,
          entry.globalRow - offset,
          tempoFxIndex,
          entry.bpm,
        )
        placed++
      }
    }
    offset += pattern.length
  }

  return placed
}
