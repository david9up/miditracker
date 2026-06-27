import { Midi } from '@tonejs/midi'
import { parseMidi } from 'midi-file'

export type MidiDiagnosticReason =
  | 'empty'
  | 'not_midi'
  | 'no_events'
  | 'no_notes'
  | 'parse_error'

export interface MidiDiagnostic {
  ok: boolean
  reason: MidiDiagnosticReason | null
  message: string
  detail?: string
}

function headerLooksLikeMidi(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer.slice(0, 4))
  return bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64
}

export function diagnoseMidiBuffer(buffer: ArrayBuffer): MidiDiagnostic {
  if (buffer.byteLength === 0) {
    return { ok: false, reason: 'empty', message: 'File is empty' }
  }

  if (!headerLooksLikeMidi(buffer)) {
    const preview = new TextDecoder('ascii', { fatal: false })
      .decode(new Uint8Array(buffer.slice(0, 8)))
      .replace(/[^\x20-\x7E]/g, '.')
    return {
      ok: false,
      reason: 'not_midi',
      message: 'Not a Standard MIDI File (missing MThd header)',
      detail: preview ? `Starts with: ${preview}` : undefined,
    }
  }

  try {
    parseMidi(new Uint8Array(buffer))
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    return {
      ok: false,
      reason: 'parse_error',
      message: 'MIDI structure could not be parsed',
      detail,
    }
  }

  try {
    const midi = new Midi(buffer)
    const noteCount = midi.tracks.reduce((total, track) => total + track.notes.length, 0)
    if (noteCount === 0) {
      return {
        ok: false,
        reason: 'no_notes',
        message: 'MIDI file has no note events',
      }
    }
    return { ok: true, reason: null, message: 'OK' }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    return {
      ok: false,
      reason: 'parse_error',
      message: 'MIDI file could not be interpreted for conversion',
      detail,
    }
  }
}

export function formatMidiImportError(buffer: ArrayBuffer, cause: unknown): string {
  const diagnostic = diagnoseMidiBuffer(buffer)
  if (!diagnostic.ok) {
    return diagnostic.detail
      ? `${diagnostic.message} (${diagnostic.detail})`
      : diagnostic.message
  }

  if (cause instanceof Error && cause.message) {
    return cause.message
  }

  return 'Could not parse MIDI file'
}
