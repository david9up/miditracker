import { describe, expect, it } from 'vitest'
import { diagnoseMidiBuffer, formatMidiImportError } from '@/lib/midi/midi-diagnose'
import { createTestMidiBuffer } from '@/lib/midi/import-midi'

describe('midi-diagnose', () => {
  it('accepts valid synthetic MIDI', () => {
    const result = diagnoseMidiBuffer(createTestMidiBuffer())
    expect(result.ok).toBe(true)
  })

  it('rejects empty buffers', () => {
    const result = diagnoseMidiBuffer(new ArrayBuffer(0))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('empty')
  })

  it('rejects non-MIDI data with a helpful message', () => {
    const text = new TextEncoder().encode('not a midi file')
    const result = diagnoseMidiBuffer(text.buffer)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_midi')
    expect(result.message).toContain('MThd')
  })

  it('reports parse errors from malformed MIDI structure', () => {
    const header = new Uint8Array([
      0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x60,
    ])
    const result = diagnoseMidiBuffer(header.buffer)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('parse_error')
  })

  it('formats import errors with diagnostic detail', () => {
    const buffer = new Uint8Array([0, 1, 2, 3]).buffer
    const message = formatMidiImportError(buffer, new Error('fallback'))
    expect(message).toContain('MThd')
  })
})
