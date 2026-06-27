import { Midi } from '@tonejs/midi'
import { parseMidi } from 'midi-file'
import type { MidiEvent } from 'midi-file'

/** Structured facts extracted from a MIDI file via independent parsers. */
export interface MidiReferenceProfile {
  title: string
  ppq: number
  durationSeconds: number
  format: number
  trackCount: number
  /** Note count from @tonejs/midi (note objects, not raw noteOn events). */
  tonejsNoteCount: number
  /** Raw noteOn events with velocity > 0 from midi-file. */
  rawNoteOnCount: number
  /** MIDI channels (0–15) that contain at least one note. */
  channelsWithNotes: number[]
  notesByChannel: Record<number, number>
  programChangeCount: number
  controllerEventCount: number
  tempoChangeCount: number
  temposBpm: number[]
}

type TimedEvent = MidiEvent & { absoluteTime?: number; channel?: number }

function attachAbsoluteTimes(tracks: TimedEvent[][]): void {
  for (const track of tracks) {
    let currentTicks = 0
    for (const event of track) {
      currentTicks += event.deltaTime
      event.absoluteTime = currentTicks
    }
  }
}

function notesByChannelFromTonejs(midi: Midi): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const track of midi.tracks) {
    if (track.notes.length === 0) continue
    const channel = track.channel
    counts[channel] = (counts[channel] ?? 0) + track.notes.length
  }
  return counts
}

/** Extract a cross-parser reference profile for regression comparisons. */
export function extractMidiReference(buffer: ArrayBuffer): MidiReferenceProfile {
  const midi = new Midi(buffer)
  const raw = parseMidi(new Uint8Array(buffer))
  attachAbsoluteTimes(raw.tracks as TimedEvent[][])

  let rawNoteOnCount = 0
  let programChangeCount = 0
  let controllerEventCount = 0
  let tempoChangeCount = 0
  const temposBpm: number[] = []

  for (const track of raw.tracks as TimedEvent[][]) {
    for (const event of track) {
      if (event.type === 'noteOn') {
        if (event.velocity > 0) {
          rawNoteOnCount++
        }
      } else if (event.type === 'programChange') {
        programChangeCount++
      } else if (event.type === 'controller') {
        controllerEventCount++
      } else if (event.type === 'setTempo') {
        tempoChangeCount++
        const microseconds = event.microsecondsPerBeat
        if (microseconds) {
          temposBpm.push(Math.round((60_000_000 / microseconds) * 100) / 100)
        }
      }
    }
  }

  const notesByChannel = notesByChannelFromTonejs(midi)
  const tonejsChannelsWithNotes = Object.keys(notesByChannel)
    .map(Number)
    .sort((a, b) => a - b)

  return {
    title: midi.name?.trim() || '',
    ppq: midi.header.ppq,
    durationSeconds: midi.duration,
    format: raw.header.format,
    trackCount: raw.tracks.length,
    tonejsNoteCount: midi.tracks.reduce((total, track) => total + track.notes.length, 0),
    rawNoteOnCount,
    channelsWithNotes: tonejsChannelsWithNotes,
    notesByChannel,
    programChangeCount,
    controllerEventCount,
    tempoChangeCount,
    temposBpm,
  }
}
