import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { countFilledSteps, countReadbackFilledSteps } from '../src/lib/export/export-quality'
import { importMidiBuffer } from '../src/lib/midi/import-midi'
import { serializePattern } from '../src/lib/export/export-tracker'
import PatternParserModule from '../node_modules/@polyend/tracker-lib/dist/patterns/pattern.js'

const parsePattern = (PatternParserModule as { parse: (b: ArrayBuffer) => unknown }).parse.bind(
  PatternParserModule,
)

const file = '01-Amiga_Turrican_Title.mid'
const bytes = readFileSync(join(import.meta.dirname, '../fixtures/game-corpus', file))
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const { song, report } = importMidiBuffer(buffer)

console.log('report.noteCount', report.noteCount)
console.log('countFilledSteps', countFilledSteps(song))
console.log('countReadbackFilledSteps', countReadbackFilledSteps(song))

const pattern = song.patterns[0]!
let sourceFilled = 0
for (const track of pattern.tracks) {
  for (const step of track) {
    if (step.note >= 0) sourceFilled++
  }
}

const readback = parsePattern(serializePattern(pattern)) as {
  tracks: Array<{ steps: Array<{ note: number }> }>
}
let readFilled = 0
let readNonZero = 0
for (const track of readback.tracks) {
  for (const step of track.steps) {
    if (step.note >= 0) readFilled++
    if (step.note > 0) readNonZero++
  }
}

console.log('pattern0 source filled (note>=0)', sourceFilled)
console.log('pattern0 readback filled (note>=0)', readFilled)
console.log('pattern0 readback note>0', readNonZero)
console.log('sample readback notes', readback.tracks[0]?.steps.slice(0, 20).map((s) => s.note))
