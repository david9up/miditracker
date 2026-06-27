import type { MidiImportReport, Pattern, Step, TrackerSong } from '@/lib/types'
import {
  DEFAULT_PATTERN_LENGTH,
  EMPTY_NOTE,
  TRACK_COUNT,
} from '@/lib/types'

export function createEmptyStep(): Step {
  return {
    note: EMPTY_NOTE,
    instrument: 0,
    volume: 0,
    fx1Type: 0,
    fx1Value: 0,
    fx2Type: 0,
    fx2Value: 0,
  }
}

export function createEmptyPattern(name: string, length = DEFAULT_PATTERN_LENGTH): Pattern {
  return {
    name,
    length,
    tracks: Array.from({ length: TRACK_COUNT }, () =>
      Array.from({ length }, () => createEmptyStep()),
    ),
  }
}

/** Default starting session — one empty 64-row pattern, no instruments assigned. */
export function createBlankSong(): TrackerSong {
  return {
    title: 'Untitled',
    bpm: 125,
    ppq: 480,
    patterns: [createEmptyPattern('Pattern 01')],
    instruments: [],
    songOrder: [0],
    tempoMap: [],
  }
}

export function blankReport(): MidiImportReport {
  return {
    title: 'Untitled',
    channelCount: TRACK_COUNT,
    channelsUsed: 0,
    patternCount: 1,
    instrumentCount: 0,
    noteCount: 0,
    ppq: 480,
    durationSeconds: 0,
    droppedChannels: 0,
    droppedChannelNames: [],
    channelMap: [],
    skippedNotes: 0,
    tempoChangeCount: 0,
    timeSignature: null,
    ccEventCount: 0,
    programChangeCount: 0,
    mappedFxCount: 0,
    skippedFxEvents: 0,
    tempoMap: [],
    tempoFxPlaced: 0,
    sourceFilename: null,
  }
}
