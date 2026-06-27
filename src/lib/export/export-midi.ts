/**
 * Export Tracker+ grid state back to Standard MIDI for hardware A/B checks.
 *
 * Tone.js builds note data and tempo meta; mid-song program changes are injected
 * with midi-file because @tonejs/midi only encodes the initial program per track.
 */
import { Midi } from '@tonejs/midi'
import { parseMidi, writeMidi } from 'midi-file'
import { openSaveAsDialog } from '@/lib/save-dialog-state'
import {
  globalRowForPosition,
  programChangeFromStep,
  tempoFxBpmFromStep,
} from '@/lib/playback-tempo'
import { rowToTicks } from '@/lib/midi/tempo-map'
import type { TrackerSong } from '@/lib/types'
import { EMPTY_NOTE, ROWS_PER_BEAT } from '@/lib/types'
import {
  canUseNativeFileSystem,
  downloadBlob,
  nativeSaveHint,
  sanitizeFilename,
  writeBlobToFileHandle,
} from '@/lib/utils'

const MIDI_ACCEPT = { 'audio/midi': ['.mid'], 'audio/mid': ['.mid'] }

function midiWriteToBuffer(midiData: ReturnType<typeof parseMidi>): ArrayBuffer {
  const bytes = writeMidi(midiData)
  const u8 = Uint8Array.from(bytes)
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
}

type TimedMidiEvent = {
  absoluteTime: number
  channel: number
  programNumber: number
}

/** Merge grid program-change FX into raw MIDI bytes after Tone.js encoding. */
function injectProgramChanges(
  buffer: ArrayBuffer,
  events: TimedMidiEvent[],
): ArrayBuffer {
  if (events.length === 0) return buffer

  const midiData = parseMidi(new Uint8Array(buffer))
  const eventsByChannel = new Map<number, TimedMidiEvent[]>()
  for (const event of events) {
    const bucket = eventsByChannel.get(event.channel) ?? []
    bucket.push(event)
    eventsByChannel.set(event.channel, bucket)
  }

  for (const track of midiData.tracks) {
    type TrackEvent = (typeof track)[number] & { absoluteTime?: number; channel?: number }

    let channel: number | undefined
    for (const event of track as TrackEvent[]) {
      if ('channel' in event && event.channel !== undefined) {
        channel = event.channel
        break
      }
    }
    if (channel === undefined) continue

    const pending = eventsByChannel.get(channel)
    if (!pending?.length) continue

    const timed: TrackEvent[] = []
    let currentTicks = 0
    for (const event of track as TrackEvent[]) {
      currentTicks += event.deltaTime
      timed.push({ ...event, absoluteTime: currentTicks })
    }

    for (const pc of pending) {
      timed.push({
        deltaTime: 0,
        absoluteTime: pc.absoluteTime,
        type: 'programChange',
        channel,
        programNumber: pc.programNumber,
      })
    }

    timed.sort((a, b) => (a.absoluteTime ?? 0) - (b.absoluteTime ?? 0))

    const rebuilt: typeof track = []
    let previousTicks = 0
    for (const event of timed) {
      const { absoluteTime, ...rest } = event
      rebuilt.push({
        ...rest,
        deltaTime: Math.max(0, (absoluteTime ?? 0) - previousTicks),
      } as (typeof track)[number])
      previousTicks = absoluteTime ?? previousTicks
    }

    const trackIndex = midiData.tracks.indexOf(track)
    midiData.tracks[trackIndex] = rebuilt
    eventsByChannel.delete(channel)
  }

  return midiWriteToBuffer(midiData)
}

/** Rebuild a Standard MIDI file from the current grid (for hardware A/B against Tracker+ export). */
export function songToMidiBuffer(song: TrackerSong): ArrayBuffer {
  const ppq = song.ppq || 480
  const midi = new Midi()
  midi.name = song.title
  midi.header.setTempo(song.bpm)

  const tempoEvents = song.tempoMap
    .filter((entry, index) => index > 0 || entry.bpm !== song.bpm)
    .map((entry) => ({
      ticks: rowToTicks(entry.row, ppq),
      bpm: entry.bpm,
    }))

  for (const tempo of tempoEvents) {
    const existing = midi.header.tempos.find((entry) => entry.ticks === tempo.ticks)
    if (existing) {
      existing.bpm = tempo.bpm
    } else {
      midi.header.tempos.push(tempo)
    }
  }

  midi.header.tempos.sort((a, b) => a.ticks - b.ticks)

  const programChanges: TimedMidiEvent[] = []
  // One row at 4 rows/beat — reference file, not legato-accurate reproduction.
  const durationTicks = Math.max(1, Math.floor(ppq / ROWS_PER_BEAT))

  for (let trackIndex = 0; trackIndex < 8; trackIndex++) {
    const instrument = song.instruments[trackIndex]
    const channel = instrument?.sourceChannel ?? trackIndex
    const track = midi.addTrack()
    track.channel = channel
    track.instrument.number = instrument?.program ?? 0

    for (let orderIndex = 0; orderIndex < song.songOrder.length; orderIndex++) {
      const patternIndex = song.songOrder[orderIndex]
      if (patternIndex === undefined) continue
      const pattern = song.patterns[patternIndex]
      if (!pattern) continue

      for (let row = 0; row < pattern.length; row++) {
        const step = pattern.tracks[trackIndex]?.[row]
        if (!step) continue

        const globalRow = globalRowForPosition(song, orderIndex, row)
        const ticks = rowToTicks(globalRow, ppq)

        if (trackIndex === 0) {
          const tempoBpm = tempoFxBpmFromStep(step)
          if (tempoBpm !== null) {
            const existing = midi.header.tempos.find((entry) => entry.ticks === ticks)
            if (existing) existing.bpm = tempoBpm
            else midi.header.tempos.push({ ticks, bpm: tempoBpm })
          }
        }

        const program = programChangeFromStep(step)
        if (program !== null) {
          programChanges.push({
            absoluteTime: ticks,
            channel,
            programNumber: program,
          })
        }

        if (step.note === EMPTY_NOTE) continue

        track.addNote({
          midi: step.note,
          ticks,
          durationTicks,
          velocity: Math.max(0.01, Math.min(1, step.volume / 100)),
        })
      }
    }
  }

  midi.header.tempos.sort((a, b) => a.ticks - b.ticks)

  const bytes = midi.toArray()
  let base = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

  if (ppq !== midi.header.ppq) {
    // Tone.js header PPQ is read-only; patch via midi-file when imports used non-480 PPQ.
    const midiData = parseMidi(new Uint8Array(base))
    midiData.header.ticksPerBeat = ppq
    base = midiWriteToBuffer(midiData)
  }

  return injectProgramChanges(base, programChanges)
}

function fallbackHint(): string {
  return `${nativeSaveHint()} File will go to your browser Downloads folder.`
}

async function promptFallbackFilename(
  suggestedName: string,
  title: string,
): Promise<string | null> {
  return openSaveAsDialog(suggestedName, title, fallbackHint())
}

async function saveMidiBuffer(buffer: ArrayBuffer, suggestedName: string, title: string): Promise<'saved' | 'cancelled'> {
  const blob = new Blob([buffer], { type: 'audio/midi' })

  if (canUseNativeFileSystem()) {
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName,
        types: [{ description: 'Standard MIDI file', accept: MIDI_ACCEPT }],
      })
      await writeBlobToFileHandle(handle, blob)
      return 'saved'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
      throw error
    }
  }

  const filename = await promptFallbackFilename(suggestedName, title)
  if (!filename) return 'cancelled'
  downloadBlob(blob, filename.endsWith('.mid') ? filename : `${filename}.mid`)
  return 'saved'
}

/** Save the converted grid as a MIDI reference file. */
export function saveGridMidiReferenceInteractive(song: TrackerSong): Promise<'saved' | 'cancelled'> {
  const suggestedName = `${sanitizeFilename(song.title, 'grid_reference')}.mid`
  const buffer = songToMidiBuffer(song)
  return saveMidiBuffer(buffer, suggestedName, 'Save MIDI Reference (grid)')
}

/** Save the original imported MIDI buffer unchanged (when available). */
export function saveSourceMidiInteractive(
  buffer: ArrayBuffer,
  sourceFilename: string | null,
): Promise<'saved' | 'cancelled'> {
  const stem = sourceFilename?.replace(/\.(mid|midi)$/i, '') ?? 'source'
  const suggestedName = `${sanitizeFilename(stem, 'source')}.mid`
  return saveMidiBuffer(buffer, suggestedName, 'Save Source MIDI')
}
