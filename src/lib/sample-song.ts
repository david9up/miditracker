/**
 * Built-in demo song for the blank-grid onboarding flow.
 *
 * Not imported from MIDI — gives users something playable/exportable while
 * they learn the grid. Channel metadata mirrors a real import report.
 */
import { blankReport, createBlankSong } from '@/lib/blank-song'
import {
  gmProgramName,
  instrumentIdForMidiChannel,
  midiChannelLabel,
  trackerMidiSlotForChannel,
} from '@/lib/midi/channels'
import { setNoteOnStep } from '@/lib/pattern-edit'
import type { MidiImportReport, Step, TrackerSong } from '@/lib/types'

function placeStep(
  step: Step,
  note: number,
  instrumentId: number,
  volume = 80,
): void {
  setNoteOnStep(step, note)
  step.instrument = instrumentId
  step.volume = volume
}

/** Short demo pattern for exploring the grid without importing MIDI. */
export function createSampleSong(): TrackerSong {
  const song = createBlankSong()
  song.title = 'Sample · C major'
  song.bpm = 120

  const pattern = song.patterns[0]!
  const pianoId = instrumentIdForMidiChannel(0)
  const bassId = instrumentIdForMidiChannel(1)

  // Melody on T1 — one note per beat (row 0, 4, 8, …).
  const melody = [60, 62, 64, 67, 69, 67, 64, 62]
  for (const [index, note] of melody.entries()) {
    placeStep(pattern.tracks[0]![index * 4]!, note, pianoId, 82)
  }

  // Bass on T2 — root movement every 16 rows.
  placeStep(pattern.tracks[1]![0]!, 48, bassId, 90)
  placeStep(pattern.tracks[1]![16]!, 48, bassId, 90)
  placeStep(pattern.tracks[1]![32]!, 43, bassId, 88)

  song.instruments = [
    {
      id: pianoId,
      name: midiChannelLabel(0, 0, gmProgramName(0)),
      sourceChannel: 0,
      program: 0,
      trackerSlot: trackerMidiSlotForChannel(0),
      fxMapping: [],
    },
    {
      id: bassId,
      name: midiChannelLabel(1, 33, gmProgramName(33)),
      sourceChannel: 1,
      program: 33,
      trackerSlot: trackerMidiSlotForChannel(1),
      fxMapping: [],
    },
  ]

  return song
}

/** Synthetic import report so Session panels show channel stats for the sample. */
export function reportForSampleSong(song: TrackerSong): MidiImportReport {
  let noteCount = 0
  for (const pattern of song.patterns) {
    for (const track of pattern.tracks) {
      noteCount += track.filter((step) => step.note >= 0).length
    }
  }

  const report = blankReport()
  report.title = song.title
  report.noteCount = noteCount
  report.channelsUsed = song.instruments.length
  report.instrumentCount = song.instruments.length
  report.channelMap = song.instruments.map((instrument, index) => ({
    track: index + 1,
    channel: instrument.sourceChannel + 1,
    instrumentId: instrument.id,
    trackerSlot: instrument.trackerSlot,
    name: instrument.name,
    noteCount: patternNoteCount(song, index),
    fxMapping: instrument.fxMapping,
  }))

  return report
}

function patternNoteCount(song: TrackerSong, trackIndex: number): number {
  let count = 0
  for (const pattern of song.patterns) {
    const track = pattern.tracks[trackIndex]
    if (!track) continue
    count += track.filter((step) => step.note >= 0).length
  }
  return count
}
