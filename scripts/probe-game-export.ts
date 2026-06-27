import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { importMidiBuffer } from '../src/lib/midi/import-midi'
import { validateSongExport } from '../src/lib/export/validate-export'

const corpusDir = join(import.meta.dirname, '../fixtures/game-corpus')
const manifest = JSON.parse(readFileSync(join(corpusDir, 'manifest.json'), 'utf8')) as {
  files: Array<{ file: string }>
}

let failed = 0
for (const entry of manifest.files) {
  const bytes = readFileSync(join(corpusDir, entry.file))
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const { song, report } = importMidiBuffer(buffer, undefined, { sourceFilename: entry.file })
  const result = await validateSongExport(song, report)
  if (!result.ok) {
    failed++
    console.log('FAIL', entry.file, result.errors.slice(0, 2))
  }
}
console.log(`done: ${manifest.files.length - failed}/${manifest.files.length} passed`)
