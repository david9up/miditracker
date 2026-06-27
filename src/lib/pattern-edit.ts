import { createEmptyStep } from '@/lib/blank-song'
import type { Step } from '@/lib/types'
import { EMPTY_NOTE } from '@/lib/types'
import { clampNote } from '@/lib/utils'

export type EditColumn =
  | 'note'
  | 'instrument'
  | 'volume'
  | 'fx1Type'
  | 'fx1Value'
  | 'fx2Type'
  | 'fx2Value'

export const EDIT_COLUMNS: EditColumn[] = [
  'note',
  'instrument',
  'volume',
  'fx1Type',
  'fx1Value',
  'fx2Type',
  'fx2Value',
]

export const KEY_TO_SEMITONE: Record<string, number> = {
  KeyZ: 0,
  KeyS: 1,
  KeyX: 2,
  KeyD: 3,
  KeyC: 4,
  KeyV: 5,
  KeyG: 6,
  KeyB: 7,
  KeyH: 8,
  KeyN: 9,
  KeyJ: 10,
  KeyM: 11,
  Comma: 12,
}

export function isNoteKey(code: string): boolean {
  return code in KEY_TO_SEMITONE
}

export function semitoneToNote(semitone: number, octave: number): number {
  return (octave + 1) * 12 + semitone
}

export function parseHexByte(value: string): number | null {
  if (value.length === 0) return null
  const parsed = Number.parseInt(value, 16)
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 255) return null
  return parsed
}

export function columnForFxSlot(slot: 1 | 2, part: 'type' | 'value'): EditColumn {
  return slot === 1
    ? part === 'type'
      ? 'fx1Type'
      : 'fx1Value'
    : part === 'type'
      ? 'fx2Type'
      : 'fx2Value'
}

export function isFxColumn(column: EditColumn): boolean {
  return column.startsWith('fx')
}

export function fxSlotForColumn(column: EditColumn): 1 | 2 | null {
  if (column.startsWith('fx1')) return 1
  if (column.startsWith('fx2')) return 2
  return null
}

export function applyHexDigit(
  step: Step,
  column: EditColumn,
  buffer: string,
  digit: string,
): { buffer: string; advance: boolean } {
  if (column === 'note') {
    return { buffer, advance: false }
  }

  const maxLen = column === 'volume' ? 3 : 2
  const nextBuffer = `${buffer}${digit}`.slice(-maxLen)

  if (column === 'volume') {
    const numeric = Number.parseInt(nextBuffer, 10)
    if (!Number.isNaN(numeric)) {
      step.volume = Math.min(100, Math.max(0, numeric))
    }
    if (nextBuffer.length >= 3) {
      return { buffer: '', advance: true }
    }
    return { buffer: nextBuffer, advance: false }
  }

  const value = parseHexByte(nextBuffer)
  if (value === null) {
    return { buffer: nextBuffer, advance: false }
  }

  switch (column) {
    case 'instrument':
      step.instrument = value === 0 ? 0 : Math.max(1, Math.min(255, value))
      break
    case 'fx1Type':
      step.fx1Type = value % 64
      break
    case 'fx1Value':
      step.fx1Value = value
      break
    case 'fx2Type':
      step.fx2Type = value % 64
      break
    case 'fx2Value':
      step.fx2Value = value
      break
    default:
      break
  }

  if (nextBuffer.length >= 2) {
    return { buffer: '', advance: true }
  }

  return { buffer: nextBuffer, advance: false }
}

export function setNoteOnStep(step: Step, note: number): void {
  step.note = clampNote(note)
}

export function clearStep(step: Step): void {
  Object.assign(step, createEmptyStep())
}

export function clearColumn(step: Step, column: EditColumn): void {
  switch (column) {
    case 'note':
      step.note = EMPTY_NOTE
      break
    case 'instrument':
      step.instrument = 0
      break
    case 'volume':
      step.volume = 0
      break
    case 'fx1Type':
      step.fx1Type = 0
      break
    case 'fx1Value':
      step.fx1Value = 0
      break
    case 'fx2Type':
      step.fx2Type = 0
      break
    case 'fx2Value':
      step.fx2Value = 0
      break
    default:
      break
  }
}

export function moveEditColumn(column: EditColumn, delta: number): EditColumn {
  const index = EDIT_COLUMNS.indexOf(column)
  const next = EDIT_COLUMNS[index + delta]
  return next ?? column
}
