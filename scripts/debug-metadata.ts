import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { importMidiBuffer } from '../src/lib/midi/import-midi'
import { serializePatternsMetadata } from '../src/lib/export/export-project'
import MetadataParserModule from '../node_modules/@polyend/tracker-lib/dist/patterns/metadata.js'

const parsePatternsMetadata = (
  MetadataParserModule as { parsePatternsMetadata(buffer: ArrayBuffer): { patternNames: string[] } }
).parsePatternsMetadata.bind(MetadataParserModule)

const file = process.argv[2] ?? '24-doom-e1m1.mid'
const bytes = readFileSync(join(import.meta.dirname, '../fixtures/game-corpus', file))
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const { song } = importMidiBuffer(buffer)

console.log('pattern names in song:', song.patterns.map((p) => p.name))
const metaBuf = serializePatternsMetadata(song)
const readback = parsePatternsMetadata(metaBuf)
console.log('readback names:', readback.patternNames.slice(0, 5))
