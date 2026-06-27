import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compareMidiImport } from '../src/lib/midi/midi-compare'

const files = process.argv.slice(2)
if (files.length === 0) files.push('00-pilot-doom-e1m1.mid', '01-haruka.mid', '05-ff7_313.mid')

for (const file of files) {
  const bytes = readFileSync(join('fixtures/midi-corpus', file))
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const result = compareMidiImport(buffer, file)
  console.log('===', file, '===')
  console.log(
    JSON.stringify(
      {
        channelsWithNotes: result.reference.channelsWithNotes,
        notesByChannel: result.reference.notesByChannel,
        channelsUsed: result.report.channelsUsed,
        dropped: result.report.droppedChannels,
        droppedNames: result.report.droppedChannelNames,
        channelMap: result.report.channelMap.map((c) => ({ ch: c.channel, n: c.noteCount })),
        droppedNoteCount: result.droppedNoteCount,
        mismatches: result.mismatches,
      },
      null,
      2,
    ),
  )
}
