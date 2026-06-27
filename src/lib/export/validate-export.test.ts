import { describe, expect, it } from 'vitest'
import { createTestMidiBuffer, importMidiBuffer } from '@/lib/midi/import-midi'
import { assessTrackerPlusReadiness } from '@/lib/export/tracker-readiness'
import { validateSongExport } from '@/lib/export/validate-export'

describe('tracker-readiness', () => {
  it('flags empty projects', () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    song.patterns = []

    const readiness = assessTrackerPlusReadiness(song)
    expect(readiness.ready).toBe(false)
    expect(readiness.blockers).toContain('No patterns to export')
  })

  it('includes MIDI hardware notes for converted songs', () => {
    const { song, report } = importMidiBuffer(createTestMidiBuffer())
    const readiness = assessTrackerPlusReadiness(song, report)

    expect(readiness.blockers).toHaveLength(0)
    expect(readiness.warnings.some((warning) => warning.includes('MIDI Out'))).toBe(true)
  })
})

describe('validateSongExport', () => {
  it('passes full round-trip validation for a simple MIDI import', async () => {
    const { song, report } = importMidiBuffer(createTestMidiBuffer())
    const result = await validateSongExport(song, report)

    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.checks.every((check) => check.ok)).toBe(true)
  })

  it('reports pattern round-trip failures', async () => {
    const { song, report } = importMidiBuffer(createTestMidiBuffer())
    song.patterns[0]!.length = 8

    const result = await validateSongExport(song, report)

    expect(result.ok).toBe(false)
    expect(result.errors.some((error) => error.includes('Pattern 1'))).toBe(true)
    expect(result.checks.find((check) => check.id === 'patterns')?.ok).toBe(false)
  })
})
