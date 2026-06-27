import type { MidiFxMapping } from '@/lib/midi/midi-fx'
import type { TempoMapEntry } from '@/lib/midi/tempo-map'

export interface Step {
  note: number
  instrument: number
  volume: number
  fx1Type: number
  fx1Value: number
  fx2Type: number
  fx2Value: number
}

export interface Pattern {
  name: string
  length: number
  tracks: Step[][]
}

export interface MidiInstrument {
  id: number
  name: string
  sourceChannel: number
  program: number
  trackerSlot: number
  fxMapping: MidiFxMapping[]
}

export interface TrackerSong {
  title: string
  bpm: number
  ppq: number
  patterns: Pattern[]
  instruments: MidiInstrument[]
  songOrder: number[]
  tempoMap: TempoMapEntry[]
}

export interface MidiChannelMapEntry {
  track: number
  channel: number
  instrumentId: number
  trackerSlot: number
  name: string
  noteCount: number
  fxMapping: MidiFxMapping[]
}

export interface MidiImportReport {
  title: string
  sourceFilename: string | null
  channelCount: number
  channelsUsed: number
  patternCount: number
  instrumentCount: number
  noteCount: number
  ppq: number
  durationSeconds: number
  droppedChannels: number
  droppedChannelNames: string[]
  channelMap: MidiChannelMapEntry[]
  skippedNotes: number
  tempoChangeCount: number
  timeSignature: string | null
  ccEventCount: number
  programChangeCount: number
  mappedFxCount: number
  skippedFxEvents: number
  tempoMap: TempoMapEntry[]
  tempoFxPlaced: number
}

export type MidiImportProgressStep = 'reading' | 'parsing' | 'quantizing' | 'building'

export interface MidiImportProgress {
  step: MidiImportProgressStep
  message: string
}

export interface MidiImportProgressCallback {
  (progress: MidiImportProgress): void
}

export interface MidiImportOptions {
  sourceFilename?: string
  /** 0-based MIDI channel numbers to import (max 8). Busiest channels used when omitted. */
  selectedChannels?: number[]
}

export interface MidiChannelCandidate {
  channel: number
  noteCount: number
  label: string
  program: number
  percussion: boolean
}

export interface MidiConversionResult {
  song: TrackerSong
  report: MidiImportReport
}

export const TRACK_COUNT = 8
export const ROWS_PER_BEAT = 4
export const EMPTY_NOTE = -1
export const DEFAULT_PATTERN_LENGTH = 64
export const MAX_PATTERN_LENGTH = 128
export const MIN_PATTERN_LENGTH = 16
