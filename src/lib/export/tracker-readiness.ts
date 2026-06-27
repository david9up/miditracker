import { LAST_MIDI_INSTRUMENT_ID, FIRST_MIDI_INSTRUMENT_ID } from '@/lib/midi/channels'
import type { MidiImportReport, TrackerSong } from '@/lib/types'
import { MAX_PATTERN_LENGTH, MIN_PATTERN_LENGTH } from '@/lib/types'

export interface TrackerPlusReadiness {
  ready: boolean
  warnings: string[]
  blockers: string[]
}

export function assessTrackerPlusReadiness(
  song: TrackerSong,
  report?: MidiImportReport,
): TrackerPlusReadiness {
  const warnings: string[] = []
  const blockers: string[] = []

  if (song.patterns.length === 0) {
    blockers.push('No patterns to export')
  }

  if (song.patterns.length > 99) {
    warnings.push(`${song.patterns.length} patterns — confirm Tracker+ project limit on hardware`)
  }

  const maxLength = Math.max(0, ...song.patterns.map((pattern) => pattern.length))
  if (maxLength > MAX_PATTERN_LENGTH) {
    blockers.push(`Pattern length ${maxLength} exceeds ${MAX_PATTERN_LENGTH} rows`)
  }

  const minLength = Math.min(...song.patterns.map((pattern) => pattern.length))
  if (song.patterns.length > 0 && minLength < MIN_PATTERN_LENGTH) {
    blockers.push(`Pattern length ${minLength} below ${MIN_PATTERN_LENGTH} row minimum`)
  }

  for (const instrument of song.instruments) {
    if (instrument.id < FIRST_MIDI_INSTRUMENT_ID || instrument.id > LAST_MIDI_INSTRUMENT_ID) {
      blockers.push(
        `${instrument.name} uses slot ${instrument.id} (MIDI slots must be 49–64)`,
      )
    }
  }

  if (report && report.channelsUsed > 0) {
    warnings.push(
      'Configure Tracker+ MIDI Out slots 48–63 to match the channel map in Export validation',
    )
  }

  if (song.patterns.length > 1) {
    warnings.push(
      `${song.patterns.length} patterns in song order — verify playback order on hardware`,
    )
  }

  if (song.tempoMap.length > 1) {
    warnings.push(
      `${song.tempoMap.length - 1} tempo change(s) — confirm T FX on track 1 after load`,
    )
  }

  if (report) {
    if (report.droppedChannels > 0) {
      warnings.push(`${report.droppedChannels} MIDI channel(s) dropped (8-track limit)`)
    }
    if (report.skippedNotes > 0) {
      warnings.push(`${report.skippedNotes} note(s) skipped during quantize`)
    }
    if (report.skippedFxEvents > 0) {
      warnings.push(`${report.skippedFxEvents} MIDI FX event(s) could not be mapped`)
    }
  }

  return {
    ready: blockers.length === 0,
    warnings,
    blockers,
  }
}
