import { PatternFX, type StepData } from '@polyend/tracker-lib'
import { fxRecordForIndex } from '@/lib/midi/midi-fx'
import type { Step } from '@/lib/types'

export function stepToTrackerStep(step: Step) {
  const fx: { type: (typeof PatternFX)[number]; value: number }[] = []

  if (step.volume > 0 && step.volume < 100) {
    const volumeFx = PatternFX.find((item) => item.symbol === 'V')
    if (volumeFx) {
      fx.push({ type: volumeFx, value: step.volume })
    }
  }

  if (step.fx1Type > 0) {
    fx.push({ type: fxRecordForIndex(step.fx1Type), value: step.fx1Value })
  }

  if (step.fx2Type > 0 && fx.length < 2) {
    fx.push({ type: fxRecordForIndex(step.fx2Type), value: step.fx2Value })
  }

  while (fx.length < 2) {
    fx.push({ type: PatternFX[0], value: 0 })
  }

  return {
    note: step.note,
    instrument: Math.max(0, step.instrument - 1),
    fx,
  }
}

export interface ExpectedStepEffects {
  volume: number | null
  fx: Array<{ index: number; value: number }>
}

/** FX slots that should survive export (tracker allows max 2). */
export function expectedStepEffects(step: Step): ExpectedStepEffects {
  const fx: Array<{ index: number; value: number }> = []
  let volume: number | null = null
  let slotCount = 0

  if (step.volume > 0 && step.volume < 100) {
    volume = step.volume
    slotCount = 1
  }

  if (step.fx1Type > 0 && slotCount < 2) {
    fx.push({ index: step.fx1Type, value: step.fx1Value })
    slotCount++
  }

  if (step.fx2Type > 0 && slotCount < 2) {
    fx.push({ index: step.fx2Type, value: step.fx2Value })
  }

  return { volume, fx }
}

const VOLUME_FX_INDEX = PatternFX.find((fx) => fx.symbol === 'V')?.index ?? -1

function fxValueForIndex(read: StepData, fxIndex: number): number | null {
  const slot = read.fx.find((entry) => entry.type.index === fxIndex && entry.type.symbol !== 'None')
  return slot ? slot.value : null
}

export function readbackStepMatches(source: Step, read: StepData): string | null {
  const expectedInstrument = Math.max(0, source.instrument - 1)
  if (read.note !== source.note || read.instrument !== expectedInstrument) {
    return 'note/instrument mismatch'
  }

  const expected = expectedStepEffects(source)

  if (expected.volume !== null) {
    const readVolume = fxValueForIndex(read, VOLUME_FX_INDEX)
    if (readVolume !== expected.volume) {
      return `volume FX expected ${expected.volume}, got ${readVolume ?? 'none'}`
    }
  }

  for (const slot of expected.fx) {
    const readValue = fxValueForIndex(read, slot.index)
    if (readValue !== slot.value) {
      return `FX ${slot.index} expected ${slot.value}, got ${readValue ?? 'none'}`
    }
  }

  return null
}
