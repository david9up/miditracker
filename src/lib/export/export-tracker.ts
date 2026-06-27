import Tracker, { type PatternData } from '@polyend/tracker-lib'
import { stepToTrackerStep } from '@/lib/export/export-step'
import type { Pattern, TrackerSong } from '@/lib/types'
import { buildTrackerProjectLayout } from '@/lib/export/export-project'
import { writePatternBuffer } from '@/lib/export/tracker-lib-io'
import { writeBlobToFileHandle, canUseNativeFileSystem } from '@/lib/utils'
import JSZip from 'jszip'

export { stepToTrackerStep, expectedStepEffects, readbackStepMatches } from '@/lib/export/export-step'

export function patternToTrackerData(pattern: Pattern): PatternData {
  const trackerPattern = Tracker.createPattern(8, pattern.length)

  pattern.tracks.forEach((track, trackIndex) => {
    const targetTrack = trackerPattern.tracks[trackIndex]
    if (!targetTrack) return

    track.forEach((step, stepIndex) => {
      targetTrack.steps[stepIndex] = stepToTrackerStep(step)
    })
  })

  return trackerPattern
}

export function serializePattern(pattern: Pattern): ArrayBuffer {
  return writePatternBuffer(patternToTrackerData(pattern))
}

export async function exportPatternFile(pattern: Pattern, filename: string): Promise<boolean> {
  const saveOptions = {
    description: 'Tracker+ pattern',
    accept: { 'application/octet-stream': ['.mtp'] },
  }

  if (!canUseNativeFileSystem()) return false

  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: filename,
      types: [{ description: saveOptions.description, accept: saveOptions.accept }],
    })
    const blob = new Blob([serializePattern(pattern)])
    await writeBlobToFileHandle(handle, blob)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    throw error
  }
}

export async function buildProjectZipBlob(song: TrackerSong): Promise<Blob> {
  const layout = buildTrackerProjectLayout(song, serializePattern)
  const zip = new JSZip()

  zip.file('project.mt', layout.projectMt)
  zip.file('patterns/patternsMetadata', layout.patternsMetadata)

  for (const patternFile of layout.patternFiles) {
    zip.file(patternFile.path, patternFile.buffer)
  }

  const manifest = {
    version: 2,
    title: song.title,
    bpm: song.bpm,
    sourceFormat: song.instruments.length > 0 ? 'midi' : 'blank',
    ppq: song.ppq,
    songOrder: song.songOrder,
    patterns: layout.patternFiles.map((entry) => ({
      index: entry.number - 1,
      file: entry.path,
      name: entry.name,
    })),
    instruments: song.instruments.map((instrument) => ({
      id: instrument.id,
      name: instrument.name,
      sourceChannel: instrument.sourceChannel + 1,
      trackerSlot: instrument.trackerSlot,
      program: instrument.program,
      fxMapping: instrument.fxMapping,
    })),
    tempoMap: song.tempoMap,
  }

  zip.file('miditracker-manifest.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'blob' })
}

export async function exportProjectZip(song: TrackerSong): Promise<boolean> {
  const { saveProjectZipInteractive } = await import('@/lib/export/save-file')
  return (await saveProjectZipInteractive(song)) === 'saved'
}

export async function exportAllPatterns(
  song: TrackerSong,
): Promise<{ saved: number; cancelled: boolean }> {
  const { saveAllPatternsInteractive } = await import('@/lib/export/save-file')
  return saveAllPatternsInteractive(song)
}
