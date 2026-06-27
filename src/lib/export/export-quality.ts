import { buildTrackerProjectLayout } from '@/lib/export/export-project'
import { readbackStepMatches } from '@/lib/export/export-step'
import { patternToTrackerData, serializePattern } from '@/lib/export/export-tracker'
import {
  parsePatternBuffer,
  parsePatternsMetadataBuffer,
  parseProjectBuffer,
} from '@/lib/export/tracker-lib-io'
import type { MidiImportReport, TrackerSong } from '@/lib/types'
import { TRACK_COUNT } from '@/lib/types'
import JSZip from 'jszip'

export interface ExportQualityReport {
  importNoteCount: number
  skippedNotes: number
  songFilledSteps: number
  readbackFilledSteps: number
  readbackParityOk: boolean
  noteRetentionFromImport: number
  patternCount: number
  zipEntryCount: number
  zipValid: boolean
  trackerLibChecksOk: boolean
  issues: string[]
}

/** Count note events placed across all patterns in memory. */
export function countFilledSteps(song: TrackerSong): number {
  let count = 0
  for (const pattern of song.patterns) {
    count += countFilledStepsInPattern(pattern)
  }
  return count
}

function countFilledStepsInPattern(pattern: TrackerSong['patterns'][number]): number {
  let count = 0
  for (const track of pattern.tracks) {
    for (const step of track) {
      if (step.note >= 0) count++
    }
  }
  return count
}

/** Count source-filled steps that survive tracker-lib serialize + parse intact. */
export function countMatchingReadbackSteps(song: TrackerSong): number {
  let count = 0
  for (const pattern of song.patterns) {
    const readback = parsePatternBuffer(serializePattern(pattern))
    for (let trackIndex = 0; trackIndex < TRACK_COUNT; trackIndex++) {
      const sourceTrack = pattern.tracks[trackIndex] ?? []
      const readbackTrack = readback.tracks[trackIndex]
      if (!readbackTrack) continue

      for (let row = 0; row < pattern.length; row++) {
        const source = sourceTrack[row]
        const read = readbackTrack.steps[row]
        if (!source || source.note < 0 || !read) continue
        if (readbackStepMatches(source, read) === null) {
          count++
        }
      }
    }
  }
  return count
}

/** Build an in-memory project ZIP (same contents as browser export). */
export async function buildProjectZipBuffer(song: TrackerSong): Promise<ArrayBuffer> {
  const layout = buildTrackerProjectLayout(song, serializePattern)
  const zip = new JSZip()

  zip.file('project.mt', layout.projectMt)
  zip.file('patterns/patternsMetadata', layout.patternsMetadata)
  for (const patternFile of layout.patternFiles) {
    zip.file(patternFile.path, patternFile.buffer)
  }

  zip.file(
    'miditracker-manifest.json',
    JSON.stringify(
      {
        version: 2,
        title: song.title,
        bpm: song.bpm,
        sourceFormat: song.instruments.length > 0 ? 'midi' : 'blank',
        ppq: song.ppq,
        songOrder: song.songOrder,
        patternCount: song.patterns.length,
      },
      null,
      2,
    ),
  )

  return zip.generateAsync({ type: 'arraybuffer' })
}

/** Verify ZIP layout and re-parse every exported artifact with tracker-lib. */
export async function verifyProjectZipWithTrackerLib(song: TrackerSong): Promise<string[]> {
  const issues: string[] = []
  const zipBuffer = await buildProjectZipBuffer(song)
  const zip = await JSZip.loadAsync(zipBuffer)

  const required = [
    'project.mt',
    'patterns/patternsMetadata',
    'miditracker-manifest.json',
    ...song.patterns.map((_, index) => `patterns/pattern_${String(index + 1).padStart(2, '0')}.mtp`),
  ]

  for (const path of required) {
    if (!zip.file(path)) {
      issues.push(`missing zip entry: ${path}`)
    }
  }

  const projectBuffer = await zip.file('project.mt')?.async('arraybuffer')
  if (projectBuffer) {
    const project = parseProjectBuffer(projectBuffer)
    if (Math.round(project.values.globalTempo) !== Math.round(song.bpm)) {
      issues.push(`project tempo ${project.values.globalTempo} != ${song.bpm}`)
    }
  }

  const metadataBuffer = await zip.file('patterns/patternsMetadata')?.async('arraybuffer')
  if (metadataBuffer) {
    const metadata = parsePatternsMetadataBuffer(metadataBuffer)
    if (metadata.patternNames.length < song.patterns.length) {
      issues.push('metadata has fewer pattern names than song')
    }
  }

  for (let index = 0; index < song.patterns.length; index++) {
    const path = `patterns/pattern_${String(index + 1).padStart(2, '0')}.mtp`
    const patternBuffer = await zip.file(path)?.async('arraybuffer')
    if (!patternBuffer) continue

    const readback = parsePatternBuffer(patternBuffer)
    if (readback.tracks.length !== TRACK_COUNT) {
      issues.push(`${path}: expected ${TRACK_COUNT} tracks`)
      continue
    }

    const source = song.patterns[index]!
    if (readback.tracks[0]?.steps.length < Math.min(source.length, 16)) {
      issues.push(`${path}: readback too short`)
    }

    patternToTrackerData(source)
  }

  return issues
}

/** Compare in-memory conversion quality against tracker-lib readback. */
export async function assessExportQuality(
  song: TrackerSong,
  report: MidiImportReport,
): Promise<ExportQualityReport> {
  const songFilledSteps = countFilledSteps(song)
  const readbackFilledSteps = countMatchingReadbackSteps(song)
  const zipIssues = await verifyProjectZipWithTrackerLib(song)
  const zipBuffer = await buildProjectZipBuffer(song)
  const zip = await JSZip.loadAsync(zipBuffer)

  const importNoteCount = report.noteCount
  const noteRetentionFromImport =
    importNoteCount > 0 ? songFilledSteps / importNoteCount : songFilledSteps === 0 ? 1 : 0

  return {
    importNoteCount,
    skippedNotes: report.skippedNotes,
    songFilledSteps,
    readbackFilledSteps,
    readbackParityOk: songFilledSteps === readbackFilledSteps,
    noteRetentionFromImport,
    patternCount: song.patterns.length,
    zipEntryCount: Object.keys(zip.files).length,
    zipValid: zipIssues.length === 0,
    trackerLibChecksOk: zipIssues.length === 0,
    issues: zipIssues,
  }
}
