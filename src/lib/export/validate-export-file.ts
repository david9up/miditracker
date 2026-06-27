import Tracker, { type PatternData } from '@polyend/tracker-lib'
import { buildProjectZipBlob } from '@/lib/export/export-tracker'
import {
  parsePatternBuffer,
  parsePatternsMetadataBuffer,
  parseProjectBuffer,
} from '@/lib/export/tracker-lib-io'
import { createBlankSong } from '@/lib/blank-song'
import { MAX_PATTERN_LENGTH, MIN_PATTERN_LENGTH, TRACK_COUNT } from '@/lib/types'
import JSZip from 'jszip'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, statSync } from 'node:fs'

export type ExportFileKind =
  | 'pattern'
  | 'project'
  | 'metadata'
  | 'project-zip'
  | 'patterns-zip'
  | 'project-dir'

export interface ExportFileCheck {
  label: string
  ok: boolean
  detail?: string
}

export interface ValidateExportFileResult {
  ok: boolean
  path: string
  kind: ExportFileKind
  checks: ExportFileCheck[]
  errors: string[]
  warnings: string[]
  summary: string
}

function pushCheck(
  checks: ExportFileCheck[],
  errors: string[],
  label: string,
  ok: boolean,
  detail?: string,
) {
  checks.push({ label, ok, detail })
  if (!ok) {
    errors.push(detail ? `${label}: ${detail}` : label)
  }
}

function validatePatternData(
  pattern: PatternData,
  label: string,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
) {
  pushCheck(
    checks,
    errors,
    `${label} parses with tracker-lib`,
    true,
    `${pattern.tracks.length} tracks`,
  )

  if (pattern.tracks.length < TRACK_COUNT) {
    pushCheck(
      checks,
      errors,
      `${label} track count`,
      false,
      `expected at least ${TRACK_COUNT}, got ${pattern.tracks.length}`,
    )
  }

  const stepCounts = pattern.tracks.map((track) => track.steps.length)
  const minSteps = stepCounts.length > 0 ? Math.min(...stepCounts) : 0
  const maxSteps = stepCounts.length > 0 ? Math.max(...stepCounts) : 0

  pushCheck(
    checks,
    errors,
    `${label} row length`,
    minSteps >= MIN_PATTERN_LENGTH && maxSteps <= MAX_PATTERN_LENGTH,
    `${minSteps}-${maxSteps} rows (allowed ${MIN_PATTERN_LENGTH}-${MAX_PATTERN_LENGTH})`,
  )

  let filledSteps = 0
  for (const track of pattern.tracks) {
    for (const step of track.steps) {
      if (step.note > 0) filledSteps++
    }
  }

  if (filledSteps === 0) {
    warnings.push(`${label} has no note events`)
  }
}

async function validatePatternPath(
  path: string,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
): Promise<void> {
  try {
    const pattern = await Tracker.readPattern(path)
    if (!pattern) {
      pushCheck(checks, errors, basename(path), false, 'tracker-lib could not parse .mtp')
      return
    }
    validatePatternData(pattern, basename(path), checks, errors, warnings)
  } catch (cause) {
    pushCheck(
      checks,
      errors,
      basename(path),
      false,
      cause instanceof Error ? cause.message : 'tracker-lib parse failed',
    )
  }
}

async function validateProjectPath(
  path: string,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
): Promise<void> {
  const project = await Tracker.readProject(path)
  if (!project) {
    pushCheck(checks, errors, basename(path), false, 'tracker-lib could not parse project.mt')
    return
  }

  pushCheck(checks, errors, 'project.mt parses with tracker-lib', true, project.projectName)
  pushCheck(
    checks,
    errors,
    'project tempo',
    project.values.globalTempo > 0,
    `${project.values.globalTempo} BPM`,
  )

  const playlist = project.song.playlist.filter((slot) => slot !== 255 && slot !== 0)
  if (playlist.length === 0) {
    warnings.push('project playlist has no pattern slots')
  }
}

async function validateMetadataPath(
  path: string,
  checks: ExportFileCheck[],
  errors: string[],
): Promise<void> {
  const metadata = await Tracker.readPatternsMetadata(path)
  if (!metadata) {
    pushCheck(checks, errors, basename(path), false, 'tracker-lib could not parse patternsMetadata')
    return
  }

  pushCheck(
    checks,
    errors,
    'patternsMetadata parses with tracker-lib',
    true,
    `${metadata.patternNames.length} pattern name(s)`,
  )
}

async function validatePatternBuffer(
  buffer: ArrayBuffer,
  label: string,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
): Promise<void> {
  try {
    const pattern = parsePatternBuffer(buffer)
    validatePatternData(pattern, label, checks, errors, warnings)
  } catch (cause) {
    pushCheck(
      checks,
      errors,
      label,
      false,
      cause instanceof Error ? cause.message : 'parse failed',
    )
  }
}

async function validateProjectZipBuffer(
  zipBuffer: ArrayBuffer,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
): Promise<void> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const entries = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir)

  pushCheck(checks, errors, 'ZIP entries', entries.length > 0, `${entries.length} file(s)`)

  const required = ['project.mt', 'patterns/patternsMetadata']
  for (const path of required) {
    pushCheck(checks, errors, `ZIP contains ${path}`, Boolean(zip.file(path)), path)
  }

  const projectBuffer = await zip.file('project.mt')?.async('arraybuffer')
  if (projectBuffer) {
    try {
      const project = parseProjectBuffer(projectBuffer)
      pushCheck(checks, errors, 'project.mt in ZIP', true, project.projectName)
      pushCheck(
        checks,
        errors,
        'project tempo in ZIP',
        project.values.globalTempo > 0,
        `${project.values.globalTempo} BPM`,
      )
    } catch (cause) {
      pushCheck(
        checks,
        errors,
        'project.mt in ZIP',
        false,
        cause instanceof Error ? cause.message : 'parse failed',
      )
    }
  }

  const metadataBuffer = await zip.file('patterns/patternsMetadata')?.async('arraybuffer')
  let metadataCount = 0
  if (metadataBuffer) {
    try {
      const metadata = parsePatternsMetadataBuffer(metadataBuffer)
      metadataCount = metadata.patternNames.length
      pushCheck(
        checks,
        errors,
        'patternsMetadata in ZIP',
        true,
        `${metadataCount} pattern name(s)`,
      )
    } catch (cause) {
      pushCheck(
        checks,
        errors,
        'patternsMetadata in ZIP',
        false,
        cause instanceof Error ? cause.message : 'parse failed',
      )
    }
  }

  const patternEntries = entries.filter((name) => name.endsWith('.mtp'))
  pushCheck(
    checks,
    errors,
    'pattern .mtp files in ZIP',
    patternEntries.length > 0,
    `${patternEntries.length} file(s)`,
  )

  if (metadataCount > 0 && patternEntries.length > 0 && metadataCount !== patternEntries.length) {
    warnings.push(
      `metadata lists ${metadataCount} pattern(s) but ZIP has ${patternEntries.length} .mtp file(s)`,
    )
  }

  for (const entry of patternEntries) {
    const buffer = await zip.file(entry)?.async('arraybuffer')
    if (!buffer) continue
    await validatePatternBuffer(buffer, entry, checks, errors, warnings)
  }

  if (!zip.file('miditracker-manifest.json')) {
    warnings.push('missing miditracker-manifest.json (optional MidiTracker manifest)')
  }
}

async function validatePatternsZipBuffer(
  zipBuffer: ArrayBuffer,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
): Promise<void> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const patternEntries = Object.keys(zip.files).filter(
    (name) => !zip.files[name]?.dir && name.toLowerCase().endsWith('.mtp'),
  )

  pushCheck(
    checks,
    errors,
    'pattern .mtp files in ZIP',
    patternEntries.length > 0,
    `${patternEntries.length} file(s)`,
  )

  for (const entry of patternEntries) {
    const buffer = await zip.file(entry)?.async('arraybuffer')
    if (!buffer) continue
    await validatePatternBuffer(buffer, entry, checks, errors, warnings)
  }
}

async function validateProjectDirectory(
  dirPath: string,
  checks: ExportFileCheck[],
  errors: string[],
  warnings: string[],
): Promise<void> {
  const projectPath = join(dirPath, 'project.mt')
  if (!existsSync(projectPath)) {
    pushCheck(checks, errors, 'project.mt in directory', false, projectPath)
    return
  }

  await validateProjectPath(projectPath, checks, errors, warnings)

  const metadataPath = join(dirPath, 'patterns', 'patternsMetadata')
  if (existsSync(metadataPath)) {
    await validateMetadataPath(metadataPath, checks, errors)
  } else {
    warnings.push('missing patterns/patternsMetadata')
  }

  const patternsDir = join(dirPath, 'patterns')
  if (!existsSync(patternsDir)) {
    warnings.push('missing patterns/ directory')
    return
  }

  const { readdir } = await import('node:fs/promises')
  const files = await readdir(patternsDir)
  const mtpFiles = files.filter((name) => name.toLowerCase().endsWith('.mtp'))
  pushCheck(
    checks,
    errors,
    'pattern .mtp files in directory',
    mtpFiles.length > 0,
    `${mtpFiles.length} file(s)`,
  )

  for (const name of mtpFiles) {
    await validatePatternPath(join(patternsDir, name), checks, errors, warnings)
  }
}

function detectKind(path: string): ExportFileKind {
  const name = basename(path)
  const ext = extname(path).toLowerCase()

  if (ext === '.mtp') return 'pattern'
  if (ext === '.mt') return 'project'
  if (name === 'patternsMetadata') return 'metadata'
  if (ext === '.zip') return 'project-zip'

  const stat = statSync(path)
  if (stat.isDirectory()) return 'project-dir'

  throw new Error(`Unsupported export path: ${path}`)
}

async function readFileBuffer(path: string): Promise<ArrayBuffer> {
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(path)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

async function detectZipKind(path: string): Promise<'project-zip' | 'patterns-zip'> {
  const zip = await JSZip.loadAsync(await readFileBuffer(path))
  if (zip.file('project.mt')) return 'project-zip'

  const hasMtp = Object.keys(zip.files).some(
    (name) => !zip.files[name]?.dir && name.toLowerCase().endsWith('.mtp'),
  )
  if (hasMtp) return 'patterns-zip'

  throw new Error(`ZIP has no project.mt or .mtp files: ${path}`)
}

export async function validateExportPath(inputPath: string): Promise<ValidateExportFileResult> {
  const checks: ExportFileCheck[] = []
  const errors: string[] = []
  const warnings: string[] = []

  let kind = detectKind(inputPath)

  if (kind === 'project-zip') {
    kind = await detectZipKind(inputPath)
  }

  switch (kind) {
    case 'pattern':
      await validatePatternPath(inputPath, checks, errors, warnings)
      break
    case 'project':
      await validateProjectPath(inputPath, checks, errors, warnings)
      break
    case 'metadata':
      await validateMetadataPath(inputPath, checks, errors)
      break
    case 'project-zip':
      await validateProjectZipBuffer(await readFileBuffer(inputPath), checks, errors, warnings)
      break
    case 'patterns-zip':
      await validatePatternsZipBuffer(await readFileBuffer(inputPath), checks, errors, warnings)
      break
    case 'project-dir':
      await validateProjectDirectory(inputPath, checks, errors, warnings)
      break
  }

  const ok = errors.length === 0
  const summary = ok
    ? `${kind} OK — ${checks.length} check(s) passed`
    : `${kind} failed — ${errors.length} error(s)`

  return { ok, path: inputPath, kind, checks, errors, warnings, summary }
}

/** Write a temporary export ZIP and validate it (used in tests). */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}

export async function validateBlankProjectZipExport(): Promise<ValidateExportFileResult> {
  const song = createBlankSong()
  const zipBuffer = await blobToArrayBuffer(await buildProjectZipBlob(song))
  const dir = await mkdtemp(join(tmpdir(), 'miditracker-validate-'))
  const zipPath = join(dir, 'blank-tracker.zip')

  try {
    await writeFile(zipPath, Buffer.from(zipBuffer))
    return await validateExportPath(zipPath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export function formatValidateExportReport(result: ValidateExportFileResult): string {
  const lines = [`${result.path} (${result.kind})`, result.summary]

  for (const check of result.checks) {
    const mark = check.ok ? '✓' : '✗'
    lines.push(`  ${mark} ${check.label}${check.detail ? ` — ${check.detail}` : ''}`)
  }

  for (const warning of result.warnings) {
    lines.push(`  ! ${warning}`)
  }

  for (const error of result.errors) {
    lines.push(`  ✗ ${error}`)
  }

  return lines.join('\n')
}
