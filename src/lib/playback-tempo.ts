/**
 * Playback timing helpers shared by GM preview and MIDI reference export.
 */
import { PROGRAM_CHANGE_FX_INDEX } from '@/lib/midi/midi-fx'
import { TEMPO_FX_INDEX } from '@/lib/midi/tempo-map'
import type { Step, TrackerSong } from '@/lib/types'
import { ROWS_PER_BEAT } from '@/lib/types'

/** Absolute row index across song order (for tempo map and MIDI export). */
export function globalRowForPosition(
  song: TrackerSong,
  orderIndex: number,
  rowInPattern: number,
): number {
  let offset = 0
  for (let i = 0; i < orderIndex; i++) {
    const patternIndex = song.songOrder[i]
    if (patternIndex === undefined) continue
    offset += song.patterns[patternIndex]?.length ?? 0
  }
  return offset + rowInPattern
}

export function bpmFromTempoMapAtRow(song: TrackerSong, globalRow: number): number {
  let bpm = song.bpm
  for (const entry of song.tempoMap) {
    if (entry.row <= globalRow) bpm = entry.bpm
    else break
  }
  return bpm
}

export function tempoFxBpmFromStep(step: Step): number | null {
  if (step.fx1Type === TEMPO_FX_INDEX && step.fx1Value > 0) {
    return step.fx1Value
  }
  if (step.fx2Type === TEMPO_FX_INDEX && step.fx2Value > 0) {
    return step.fx2Value
  }
  return null
}

export function programChangeFromStep(step: Step): number | null {
  if (step.fx1Type === PROGRAM_CHANGE_FX_INDEX && step.fx1Value >= 0) {
    return step.fx1Value % 128
  }
  if (step.fx2Type === PROGRAM_CHANGE_FX_INDEX && step.fx2Value >= 0) {
    return step.fx2Value % 128
  }
  return null
}

export function rowDurationMs(bpm: number, rowsPerBeat = ROWS_PER_BEAT): number {
  return (60_000 / bpm) / rowsPerBeat
}

export function initialTrackPrograms(song: TrackerSong): number[] {
  const defaults = [0, 24, 32, 40, 48, 56, 64, 72]
  return Array.from({ length: 8 }, (_, trackIndex) => {
    const mapped = song.instruments.find((item) => item.trackerSlot === trackIndex + 48)
    if (mapped) return mapped.program
    const ordered = song.instruments[trackIndex]
    if (ordered) return ordered.program
    return defaults[trackIndex] ?? 0
  })
}
