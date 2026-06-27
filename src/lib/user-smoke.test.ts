import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { createBlankSong } from '@/lib/blank-song'
import { buildProjectZipBlob } from '@/lib/export/export-tracker'
import {
  validateBlankProjectZipExport,
  validateExportPath,
} from '@/lib/export/validate-export-file'
import { validateSongExport } from '@/lib/export/validate-export'
import {
  bpmFromTempoMapAtRow,
  globalRowForPosition,
  programChangeFromStep,
  tempoFxBpmFromStep,
} from '@/lib/playback-tempo'
import { PROGRAM_CHANGE_FX_INDEX } from '@/lib/midi/midi-fx'
import { TEMPO_FX_INDEX } from '@/lib/midi/tempo-map'
import { createTestMidiBuffer, importMidiBuffer, listMidiChannelCandidates } from '@/lib/midi/import-midi'
import { setNoteOnStep } from '@/lib/pattern-edit'

/**
 * End-to-end smoke path: import → validate → export ZIP on disk.
 * Mirrors the manual release checklist in one Vitest case.
 */
describe('user test checklist', () => {
  it('covers import, validation, export, playback helpers, and save guards', async () => {
    const blank = createBlankSong()
    expect(
      blank.patterns.some((p) => p.tracks.some((t) => t.some((s) => s.note >= 0))),
    ).toBe(false)

    const buffer = createTestMidiBuffer()
    const candidates = listMidiChannelCandidates(buffer)
    expect(candidates.length).toBeGreaterThan(0)

    const { song, report } = importMidiBuffer(buffer, undefined, { sourceFilename: 'smoke.mid' })
    expect(report.noteCount).toBeGreaterThan(0)
    expect(report.channelMap.every((e) => e.channel >= 1 && e.channel <= 16)).toBe(true)

    const validation = await validateSongExport(song, report)
    expect(validation.ok).toBe(true)
    expect(Array.isArray(validation.warnings)).toBe(true)

    const blankZip = await validateBlankProjectZipExport()
    expect(blankZip.ok).toBe(true)

    const dir = await mkdtemp(join(tmpdir(), 'miditracker-user-smoke-'))
    const zipPath = join(dir, 'smoke-project.zip')
    try {
      const zipBuffer = await (await buildProjectZipBlob(song)).arrayBuffer()
      await writeFile(zipPath, Buffer.from(zipBuffer))
      const fileValidation = await validateExportPath(zipPath)
      expect(fileValidation.ok).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }

    song.tempoMap = [
      { row: 0, ticks: 0, bpm: 100, patternSplit: false },
      { row: 32, ticks: 0, bpm: 140, patternSplit: true },
    ]
    expect(bpmFromTempoMapAtRow(song, 40)).toBe(140)
    expect(
      tempoFxBpmFromStep({
        note: -1,
        instrument: 0,
        volume: 0,
        fx1Type: TEMPO_FX_INDEX,
        fx1Value: 128,
        fx2Type: 0,
        fx2Value: 0,
      }),
    ).toBe(128)
    expect(
      programChangeFromStep({
        note: 60,
        instrument: 49,
        volume: 72,
        fx1Type: PROGRAM_CHANGE_FX_INDEX,
        fx1Value: 42,
        fx2Type: 0,
        fx2Value: 0,
      }),
    ).toBe(42)
    expect(globalRowForPosition(song, 0, 8)).toBe(8)

    const withNotes = createBlankSong()
    setNoteOnStep(withNotes.patterns[0]!.tracks[0]![0]!, 60)
    expect(
      withNotes.patterns.some((p) => p.tracks.some((t) => t.some((s) => s.note >= 0))),
    ).toBe(true)

    expect(
      report.channelMap.every((e) => e.trackerSlot >= 48 && e.trackerSlot <= 63),
    ).toBe(true)
  })
})
