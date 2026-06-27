import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compareMidiImport } from '../src/lib/midi/midi-compare'
import { extractMidiReference } from '../src/lib/midi/midi-reference'
import { importMidiBuffer } from '../src/lib/midi/import-midi'

const corpusDir = join(import.meta.dirname, '../fixtures/midi-corpus')
const files = process.argv.slice(2)

for (const file of files) {
  const bytes = readFileSync(join(corpusDir, file))
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  console.log(`\n=== ${file} ===`)
  try {
    const ref = extractMidiReference(buffer)
    console.log('reference ok', {
      channelsWithNotes: ref.channelsWithNotes,
      notesByChannel: ref.notesByChannel,
      tonejsNoteCount: ref.tonejsNoteCount,
    })
  } catch (error) {
    console.log('reference failed', error instanceof Error ? error.message : error)
  }
  try {
    const { report } = importMidiBuffer(buffer)
    console.log('import ok', {
      channelsUsed: report.channelsUsed,
      channelMap: report.channelMap.map((c) => ({ ch: c.channel, n: c.noteCount })),
      dropped: report.droppedChannels,
    })
  } catch (error) {
    console.log('import failed', error instanceof Error ? error.message : error)
  }
  try {
    const result = compareMidiImport(buffer, file)
    console.log('compare', { ok: result.ok, mismatches: result.mismatches })
  } catch (error) {
    console.log('compare failed', error instanceof Error ? error.message : error)
  }
}
