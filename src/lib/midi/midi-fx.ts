/**
 * Map MIDI controllers and program changes to Tracker FX slots a–f.
 *
 * CC7 (volume) never consumes a slot — it maps to the step volume column.
 * Slot f is reserved for program change when the source channel uses PC events.
 */
import { PatternFX } from '@polyend/tracker-lib'

export type MidiFxSlot = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'

export interface MidiFxMapping {
  slot: MidiFxSlot
  kind: 'cc' | 'pc'
  ccNumber?: number
  fxIndex: number
}

export const MIDI_FX_SLOTS: Array<{ slot: MidiFxSlot; fxIndex: number }> = [
  { slot: 'a', fxIndex: 8 },
  { slot: 'b', fxIndex: 9 },
  { slot: 'c', fxIndex: 10 },
  { slot: 'd', fxIndex: 11 },
  { slot: 'e', fxIndex: 12 },
  { slot: 'f', fxIndex: 37 },
]

export const VOLUME_CC = 7

/** Tracker FX index for program change (slot f). */
export const PROGRAM_CHANGE_FX_INDEX = 37

export const CC_NAMES: Record<number, string> = {
  1: 'Modulation',
  7: 'Volume',
  10: 'Pan',
  11: 'Expression',
  64: 'Sustain',
  71: 'Filter resonance',
  74: 'Brightness',
}

export function ccLabel(number: number): string {
  return CC_NAMES[number] ?? `CC ${number}`
}

export function fxRecordForIndex(index: number) {
  return PatternFX.find((fx) => fx.index === index) ?? PatternFX[0]
}

export function fxSymbolForIndex(index: number): string {
  return fxRecordForIndex(index).symbol
}

export function buildFxMappings(options: {
  ccNumbers: number[]
  hasProgramChanges: boolean
}): MidiFxMapping[] {
  const slots = [...MIDI_FX_SLOTS]
  const mappings: MidiFxMapping[] = []

  if (options.hasProgramChanges) {
    const pcSlot = slots.pop()
    if (pcSlot) {
      mappings.push({
        slot: pcSlot.slot,
        kind: 'pc',
        fxIndex: pcSlot.fxIndex,
      })
    }
  }

  const ccWithoutVolume = options.ccNumbers.filter((number) => number !== VOLUME_CC)
  // Most frequent CCs win when a channel has more controllers than free slots.
  for (const ccNumber of ccWithoutVolume.slice(0, slots.length)) {
    const slot = slots.shift()
    if (!slot) break
    mappings.push({
      slot: slot.slot,
      kind: 'cc',
      ccNumber,
      fxIndex: slot.fxIndex,
    })
  }

  return mappings
}

export function mappingForCc(
  mappings: MidiFxMapping[],
  ccNumber: number,
): MidiFxMapping | undefined {
  return mappings.find((mapping) => mapping.kind === 'cc' && mapping.ccNumber === ccNumber)
}

export function mappingForProgramChange(
  mappings: MidiFxMapping[],
): MidiFxMapping | undefined {
  return mappings.find((mapping) => mapping.kind === 'pc')
}
