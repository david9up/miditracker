const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function clampNote(note: number): number {
  return Math.min(127, Math.max(0, note))
}

export function noteToString(note: number): string {
  if (note < 0) return '---'
  const name = NOTE_NAMES[note % 12]
  const octave = Math.floor(note / 12) - 1
  return `${name}-${octave}`
}

export function sanitizeFilename(name: string, fallback = 'export'): string {
  const trimmed = name.trim() || fallback
  return trimmed.replace(/[^\w\-+. ]+/g, '_').replace(/\s+/g, '_').slice(0, 80)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export interface SaveBlobOptions {
  description?: string
  accept?: Record<string, string[]>
}

export function canPromptSaveFile(): boolean {
  return canUseNativeFileSystem()
}

export function canUseNativeFileSystem(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof window.showSaveFilePicker === 'function'
  )
}

export function canUseDirectoryPicker(): boolean {
  return canUseNativeFileSystem() && typeof window.showDirectoryPicker === 'function'
}

export function nativeSaveHint(): string {
  if (typeof window === 'undefined') return ''
  if (!window.isSecureContext) {
    return 'Open this app at http://127.0.0.1:5310 (not an IP or forwarded URL) for the system Save As dialog.'
  }
  if (typeof window.showSaveFilePicker !== 'function') {
    return 'Use Chrome, Edge, or Safari for the system Save As dialog.'
  }
  return ''
}

/** Opens the native Save As dialog. Returns null if unsupported or cancelled. */
export async function promptSaveFile(
  suggestedName: string,
  options: SaveBlobOptions = {},
): Promise<FileSystemFileHandle | null> {
  if (!canPromptSaveFile()) return null

  try {
    return await window.showSaveFilePicker!({
      suggestedName,
      types: [
        {
          description: options.description ?? 'File',
          accept: options.accept ?? { 'application/octet-stream': [] },
        },
      ],
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    throw error
  }
}

export async function writeBlobToFileHandle(
  handle: FileSystemFileHandle,
  blob: Blob,
): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
}

/** Opens Save As immediately when supported, then writes the blob. */
export async function saveBlobAs(
  blob: Blob,
  suggestedName: string,
  options: SaveBlobOptions = {},
): Promise<boolean> {
  const handle = await promptSaveFile(suggestedName, options)
  if (canPromptSaveFile() && !handle) return false

  if (handle) {
    await writeBlobToFileHandle(handle, blob)
    return true
  }

  downloadBlob(blob, suggestedName)
  return true
}
