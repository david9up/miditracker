import {
  buildProjectFromSong,
  buildTrackerPlaylist,
  buildTrackerProjectLayout,
  readProjectBuffer,
  serializePatternsMetadata,
  serializeProject,
} from '@/lib/export/export-project'
import { patternToTrackerData, serializePattern } from '@/lib/export/export-tracker'
import { readbackStepMatches } from '@/lib/export/export-step'
import { assessTrackerPlusReadiness } from '@/lib/export/tracker-readiness'
import {
  parsePatternBuffer,
  parsePatternsMetadataBuffer,
} from '@/lib/export/tracker-lib-io'
import type { MidiImportReport, Pattern, TrackerSong } from '@/lib/types'
import { MAX_PATTERN_LENGTH, MIN_PATTERN_LENGTH, TRACK_COUNT } from '@/lib/types'

export interface ExportValidationCheck {
  id: string
  label: string
  ok: boolean
  detail?: string
}

export interface ExportValidationResult {
  ok: boolean
  checks: ExportValidationCheck[]
  errors: string[]
  warnings: string[]
}

async function validatePatternRoundTrip(pattern: Pattern): Promise<string[]> {
  const errors: string[] = []

  if (pattern.length < MIN_PATTERN_LENGTH || pattern.length > MAX_PATTERN_LENGTH) {
    errors.push(`length ${pattern.length} outside ${MIN_PATTERN_LENGTH}-${MAX_PATTERN_LENGTH}`)
  }

  if (pattern.tracks.length !== TRACK_COUNT) {
    errors.push(`${pattern.tracks.length} tracks (expected ${TRACK_COUNT})`)
  }

  try {
    const buffer = serializePattern(pattern)
    const readback = parsePatternBuffer(buffer)

    if (readback.tracks.length !== TRACK_COUNT) {
      errors.push(`readback has ${readback.tracks.length} tracks`)
    }

    for (let trackIndex = 0; trackIndex < TRACK_COUNT; trackIndex++) {
      const readbackTrack = readback.tracks[trackIndex]
      const readbackRows = readbackTrack?.steps.length ?? 0
      if (readbackRows < Math.min(pattern.length, MIN_PATTERN_LENGTH)) {
        errors.push(`track ${trackIndex + 1} too short after readback (${readbackRows} rows)`)
        break
      }
    }

    let mismatchCount = 0
    for (let trackIndex = 0; trackIndex < TRACK_COUNT; trackIndex++) {
      const sourceTrack = pattern.tracks[trackIndex] ?? []
      const readbackTrack = readback.tracks[trackIndex]
      if (!readbackTrack) continue

      for (let row = 0; row < pattern.length; row++) {
        const source = sourceTrack[row]
        const read = readbackTrack.steps[row]
        if (!source || source.note < 0) continue

        const mismatch = readbackStepMatches(source, read)
        if (mismatch) {
          mismatchCount++
          if (mismatchCount <= 2) {
            errors.push(`T${trackIndex + 1} row ${row.toString(16).toUpperCase()}: ${mismatch}`)
          }
        }
      }
    }

    if (mismatchCount > 2) {
      errors.push(`${mismatchCount} filled-step mismatches after readback`)
    }
  } catch (cause) {
    errors.push(cause instanceof Error ? cause.message : 'pattern serialize failed')
  }

  return errors
}

async function validateProjectRoundTrip(song: TrackerSong): Promise<string[]> {
  const errors: string[] = []

  try {
    const project = buildProjectFromSong(song)
    const buffer = serializeProject(project)
    const readback = readProjectBuffer(buffer)

    const expectedPlaylist = buildTrackerPlaylist(song.songOrder).slice(0, song.songOrder.length + 1)
    const actualPlaylist = readback.song.playlist.slice(0, song.songOrder.length + 1)

    if (readback.projectName !== project.projectName) {
      errors.push('project name mismatch')
    }

    if (Math.round(readback.values.globalTempo) !== Math.round(song.bpm)) {
      errors.push(`tempo ${readback.values.globalTempo} ≠ ${song.bpm}`)
    }

    if (!expectedPlaylist.every((slot, index) => actualPlaylist[index] === slot)) {
      errors.push('song playlist mismatch')
    }
  } catch (cause) {
    errors.push(cause instanceof Error ? cause.message : 'project serialize failed')
  }

  return errors
}

async function validateMetadataRoundTrip(song: TrackerSong): Promise<string[]> {
  const errors: string[] = []

  try {
    const buffer = serializePatternsMetadata(song)
    const readback = parsePatternsMetadataBuffer(buffer)

    if (readback.patternNames.length < song.patterns.length) {
      errors.push('metadata missing pattern names')
    }

    for (let index = 0; index < song.patterns.length; index++) {
      const expected = song.patterns[index]?.name.trim().slice(0, 31) ?? ''
      const actual = readback.patternNames[index]?.trim() ?? ''
      if (expected && actual !== expected) {
        errors.push(`pattern ${index + 1} name mismatch`)
        break
      }
    }
  } catch (cause) {
    errors.push(cause instanceof Error ? cause.message : 'metadata serialize failed')
  }

  return errors
}

function validateProjectLayout(song: TrackerSong): string[] {
  const errors: string[] = []

  try {
    const layout = buildTrackerProjectLayout(song, serializePattern)

    if (layout.projectMt.byteLength === 0) {
      errors.push('project.mt is empty')
    }

    if (layout.patternsMetadata.byteLength === 0) {
      errors.push('patternsMetadata is empty')
    }

    if (layout.patternFiles.length !== song.patterns.length) {
      errors.push('pattern file count mismatch')
    }

    for (const patternFile of layout.patternFiles) {
      if (patternFile.buffer.byteLength === 0) {
        errors.push(`${patternFile.path} is empty`)
      }
    }

    readProjectBuffer(layout.projectMt)
    patternToTrackerData(song.patterns[0]!)
  } catch (cause) {
    errors.push(cause instanceof Error ? cause.message : 'layout build failed')
  }

  return errors
}

export async function validateSongExport(
  song: TrackerSong,
  report?: MidiImportReport,
): Promise<ExportValidationResult> {
  const checks: ExportValidationCheck[] = []
  const errors: string[] = []
  const warnings: string[] = []

  const readiness = assessTrackerPlusReadiness(song, report)
  warnings.push(...readiness.warnings)

  if (readiness.blockers.length > 0) {
    errors.push(...readiness.blockers)
  }

  checks.push({
    id: 'readiness',
    label: 'Tracker+ readiness',
    ok: readiness.blockers.length === 0,
    detail:
      readiness.blockers.length > 0
        ? readiness.blockers[0]
        : readiness.warnings.length > 0
          ? `${readiness.warnings.length} hardware note(s)`
          : 'Ready for export',
  })

  const patternErrors: string[] = []
  for (const [index, pattern] of song.patterns.entries()) {
    const result = await validatePatternRoundTrip(pattern)
    if (result.length > 0) {
      patternErrors.push(`Pattern ${index + 1}: ${result.join(', ')}`)
    }
  }

  if (patternErrors.length > 0) {
    errors.push(...patternErrors)
  }

  checks.push({
    id: 'patterns',
    label: `${song.patterns.length} pattern .mtp round-trip`,
    ok: patternErrors.length === 0,
    detail: patternErrors[0],
  })

  const projectErrors = await validateProjectRoundTrip(song)
  if (projectErrors.length > 0) {
    errors.push(`project.mt: ${projectErrors.join(', ')}`)
  }

  checks.push({
    id: 'project',
    label: 'project.mt round-trip',
    ok: projectErrors.length === 0,
    detail: projectErrors[0],
  })

  const metadataErrors = await validateMetadataRoundTrip(song)
  if (metadataErrors.length > 0) {
    errors.push(`patternsMetadata: ${metadataErrors.join(', ')}`)
  }

  checks.push({
    id: 'metadata',
    label: 'patternsMetadata round-trip',
    ok: metadataErrors.length === 0,
    detail: metadataErrors[0],
  })

  const layoutErrors = validateProjectLayout(song)
  if (layoutErrors.length > 0) {
    errors.push(`layout: ${layoutErrors.join(', ')}`)
  }

  checks.push({
    id: 'layout',
    label: 'ZIP project layout',
    ok: layoutErrors.length === 0,
    detail: layoutErrors[0],
  })

  return {
    ok: errors.length === 0,
    checks,
    errors,
    warnings,
  }
}

export async function verifyPatternExport(pattern: Pattern): Promise<boolean> {
  const errors = await validatePatternRoundTrip(pattern)
  return errors.length === 0
}

export async function verifyTrackerProjectExport(song: TrackerSong): Promise<boolean> {
  const projectErrors = await validateProjectRoundTrip(song)
  return projectErrors.length === 0
}
