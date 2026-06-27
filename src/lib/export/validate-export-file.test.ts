import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createBlankSong } from '@/lib/blank-song'
import { buildProjectZipBlob, serializePattern } from '@/lib/export/export-tracker'
import {
  formatValidateExportReport,
  validateBlankProjectZipExport,
  validateExportPath,
} from '@/lib/export/validate-export-file'
import JSZip from 'jszip'

describe('validate-export-file', () => {
  it('validates a blank project ZIP export', async () => {
    const result = await validateBlankProjectZipExport()
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('project-zip')
    expect(formatValidateExportReport(result)).toContain('project-zip OK')
  })

  it('validates a single .mtp file on disk', async () => {
    const song = createBlankSong()
    const dir = await mkdtemp(join(tmpdir(), 'miditracker-mtp-'))
    const path = join(dir, 'pattern_01.mtp')

    try {
      await writeFile(path, Buffer.from(serializePattern(song.patterns[0]!)))
      const result = await validateExportPath(path)
      expect(result.ok).toBe(true)
      expect(result.kind).toBe('pattern')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('validates a patterns-only ZIP', async () => {
    const song = createBlankSong()
    const zip = new JSZip()
    zip.file('pattern_01.mtp', serializePattern(song.patterns[0]!))
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    const dir = await mkdtemp(join(tmpdir(), 'miditracker-patterns-zip-'))
    const path = join(dir, 'patterns-mtp.zip')

    try {
      await writeFile(path, Buffer.from(zipBuffer))
      const result = await validateExportPath(path)
      expect(result.ok).toBe(true)
      expect(result.kind).toBe('patterns-zip')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('reports errors for corrupt pattern files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'miditracker-bad-'))
    const path = join(dir, 'broken.mtp')

    try {
      await writeFile(path, Buffer.from([0, 1, 2, 3]))
      const result = await validateExportPath(path)
      expect(result.ok).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('validates project ZIP built the same way as browser export', async () => {
    const song = createBlankSong()
    const zipBuffer = await (await buildProjectZipBlob(song)).arrayBuffer()
    const dir = await mkdtemp(join(tmpdir(), 'miditracker-browser-zip-'))
    const path = join(dir, 'browser-export.zip')

    try {
      await writeFile(path, Buffer.from(zipBuffer))
      const result = await validateExportPath(path)
      expect(result.ok).toBe(true)
      expect(result.checks.some((check) => check.label === 'ZIP contains project.mt')).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
