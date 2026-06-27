import { describe, expect, it } from 'vitest'
import { createTestMidiBuffer, importMidiBuffer } from '@/lib/midi/import-midi'
import {
  buildProjectFromSong,
  buildTrackerPlaylist,
  buildTrackerProjectLayout,
  patternFilePath,
  readProjectBuffer,
  serializeProject,
} from '@/lib/export/export-project'
import { serializePattern } from '@/lib/export/export-tracker'
import { verifyTrackerProjectExport } from '@/lib/export/validate-export'

describe('export-project', () => {
  it('builds a tracker playlist with 1-based pattern numbers', () => {
    expect(buildTrackerPlaylist([0, 1, 2])).toEqual([1, 2, 3, 255, ...new Array(251).fill(0)])
  })

  it('names pattern files like Tracker projects', () => {
    expect(patternFilePath(1)).toBe('patterns/pattern_01.mtp')
    expect(patternFilePath(11)).toBe('patterns/pattern_11.mtp')
  })

  it('serializes project.mt readable by tracker-lib', async () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    const project = buildProjectFromSong(song)
    const buffer = serializeProject(project)
    const readback = readProjectBuffer(buffer)

    expect(readback?.projectName).toBe(project.projectName)
    expect(Math.round(readback?.values.globalTempo ?? 0)).toBe(song.bpm)
    expect(readback?.song.playlist[0]).toBe(1)
  })

  it('builds a full tracker project layout', () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    const layout = buildTrackerProjectLayout(song, serializePattern)

    expect(layout.projectMt.byteLength).toBeGreaterThan(0)
    expect(layout.patternsMetadata.byteLength).toBeGreaterThan(0)
    expect(layout.patternFiles.length).toBe(song.patterns.length)
    expect(layout.patternFiles[0]?.path).toBe('patterns/pattern_01.mtp')
  })

  it('verifies project export round-trip', async () => {
    const { song } = importMidiBuffer(createTestMidiBuffer())
    await expect(verifyTrackerProjectExport(song)).resolves.toBe(true)
  })
})
