/**
 * MIDI tempo meta ↔ Tracker `T` FX and row timing helpers.
 *
 * Tracker+ uses 4 pattern rows per quarter note; tick conversion is linear
 * from the file PPQ regardless of absolute tempo.
 */
export interface MidiTempoEvent {
  ticks: number
  bpm: number
}
export const TEMPO_FX_INDEX = 15
export const TEMPO_FX_MIN = 4
export const TEMPO_FX_MAX = 200

export interface TempoMapEntry {
  /** Global pattern row (0-based). */
  row: number
  ticks: number
  bpm: number
  /** True when this entry starts a new pattern after a tempo split. */
  patternSplit: boolean
}

export function bpmToTempoFxValue(bpm: number): number {
  return Math.max(TEMPO_FX_MIN, Math.min(TEMPO_FX_MAX, Math.round(bpm)))
}

/** Map file ticks to pattern rows (4 rows per beat at any PPQ). */
export function ticksToRow(ticks: number, ppq: number): number {
  return Math.max(0, Math.round((ticks / ppq) * 4))
}

export function normalizeTempos(tempos: MidiTempoEvent[]): MidiTempoEvent[] {
  if (tempos.length === 0) {
    return [{ ticks: 0, bpm: 120 }]
  }

  const sorted = [...tempos].sort((a, b) => a.ticks - b.ticks || a.bpm - b.bpm)
  const unique: MidiTempoEvent[] = []

  for (const tempo of sorted) {
    const last = unique[unique.length - 1]
    if (last && last.ticks === tempo.ticks) {
      last.bpm = tempo.bpm
    } else {
      unique.push({ ticks: tempo.ticks, bpm: tempo.bpm })
    }
  }

  return unique
}

export function buildTempoMap(tempos: MidiTempoEvent[], ppq: number): TempoMapEntry[] {
  const normalized = normalizeTempos(tempos)
  return normalized.map((tempo, index) => ({
    row: ticksToRow(tempo.ticks, ppq),
    ticks: tempo.ticks,
    bpm: Math.round(tempo.bpm),
    patternSplit: index > 0,
  }))
}

export function tempoChangesForFx(tempoMap: TempoMapEntry[]): TempoMapEntry[] {
  return tempoMap.filter((entry, index) => index > 0 || entry.row > 0)
}

export function rowToTicks(row: number, ppq: number): number {
  return Math.round((row / 4) * ppq)
}
