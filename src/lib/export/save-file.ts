import { buildProjectZipBlob, serializePattern } from '@/lib/export/export-tracker'
import { openSaveAsDialog } from '@/lib/save-dialog-state'
import type { TrackerSong } from '@/lib/types'
import {
  canUseDirectoryPicker,
  canUseNativeFileSystem,
  downloadBlob,
  nativeSaveHint,
  sanitizeFilename,
  writeBlobToFileHandle,
} from '@/lib/utils'
import JSZip from 'jszip'

export type SaveOutcome = 'saved' | 'cancelled'

export interface SavePatternsResult {
  saved: number
  cancelled: boolean
  /** Individual .mtp files in a folder (native folder picker). */
  asFolder?: boolean
}

const PROJECT_ZIP_ACCEPT = { 'application/zip': ['.zip'] }
const PATTERNS_ZIP_ACCEPT = { 'application/zip': ['.zip'] }

function fallbackHint(): string {
  return `${nativeSaveHint()} File will go to your browser Downloads folder.`
}

async function promptFallbackFilename(
  suggestedName: string,
  title: string,
): Promise<string | null> {
  return openSaveAsDialog(suggestedName, title, fallbackHint())
}

function patternFilename(patternName: string, index: number): string {
  const safeName = sanitizeFilename(patternName, `pattern_${String(index + 1).padStart(2, '0')}`)
  return `${safeName}.mtp`
}

async function buildPatternsZipBlob(song: TrackerSong): Promise<Blob> {
  const zip = new JSZip()
  for (const [index, pattern] of song.patterns.entries()) {
    zip.file(patternFilename(pattern.name, index), serializePattern(pattern))
  }
  return zip.generateAsync({ type: 'blob' })
}

async function writePatternsToDirectory(
  directory: FileSystemDirectoryHandle,
  song: TrackerSong,
): Promise<number> {
  let saved = 0
  for (const [index, pattern] of song.patterns.entries()) {
    const handle = await directory.getFileHandle(patternFilename(pattern.name, index), {
      create: true,
    })
    const blob = new Blob([serializePattern(pattern)])
    await writeBlobToFileHandle(handle, blob)
    saved++
  }
  return saved
}

/** One Save As dialog for a ZIP of all patterns (fallback when folder picker is unavailable). */
function saveAllPatternsAsZipInteractive(song: TrackerSong): Promise<SavePatternsResult> {
  const suggestedName = `${sanitizeFilename(song.title, 'patterns')}-mtp.zip`

  if (canUseNativeFileSystem()) {
    return new Promise((resolve, reject) => {
      window.showSaveFilePicker!({
        suggestedName,
        types: [
          {
            description: 'Tracker+ patterns archive',
            accept: PATTERNS_ZIP_ACCEPT,
          },
        ],
      })
        .then(async (handle) => {
          const blob = await buildPatternsZipBlob(song)
          await writeBlobToFileHandle(handle, blob)
          resolve({ saved: song.patterns.length, cancelled: false, asFolder: false })
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            resolve({ saved: 0, cancelled: true })
            return
          }
          reject(error)
        })
    })
  }

  return (async () => {
    const filename = await promptFallbackFilename(suggestedName, 'Save Patterns')
    if (!filename) return { saved: 0, cancelled: true }
    const blob = await buildPatternsZipBlob(song)
    downloadBlob(blob, filename.endsWith('.zip') ? filename : `${filename}.zip`)
    return { saved: song.patterns.length, cancelled: false, asFolder: false }
  })()
}

/** Call native pickers synchronously from the click handler (required by browsers). */
export function saveProjectZipInteractive(song: TrackerSong): Promise<SaveOutcome> {
  const suggestedName = `${sanitizeFilename(song.title, 'midi_project')}-tracker.zip`

  if (canUseNativeFileSystem()) {
    return new Promise((resolve, reject) => {
      window.showSaveFilePicker!({
        suggestedName,
        types: [
          {
            description: 'Tracker+ project archive',
            accept: PROJECT_ZIP_ACCEPT,
          },
        ],
      })
        .then(async (handle) => {
          const blob = await buildProjectZipBlob(song)
          await writeBlobToFileHandle(handle, blob)
          resolve('saved')
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            resolve('cancelled')
            return
          }
          reject(error)
        })
    })
  }

  return (async () => {
    const filename = await promptFallbackFilename(suggestedName, 'Save Project')
    if (!filename) return 'cancelled'
    const blob = await buildProjectZipBlob(song)
    downloadBlob(blob, filename)
    return 'saved'
  })()
}

/** Pick a folder once, or save all patterns in one ZIP with a single Save As dialog. */
export function saveAllPatternsInteractive(song: TrackerSong): Promise<SavePatternsResult> {
  if (canUseDirectoryPicker()) {
    return new Promise((resolve, reject) => {
      window.showDirectoryPicker!({ mode: 'readwrite', id: 'miditracker-patterns' })
        .then(async (directory) => {
          const saved = await writePatternsToDirectory(directory, song)
          resolve({ saved, cancelled: false, asFolder: true })
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            resolve({ saved: 0, cancelled: true })
            return
          }
          reject(error)
        })
    })
  }

  return saveAllPatternsAsZipInteractive(song)
}
