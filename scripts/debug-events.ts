import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { collectChannelMidiEvents } from '../src/lib/midi/midi-events'
import { Midi } from '@tonejs/midi'

const file = process.argv[2] ?? '05-ff7_313.mid'
const bytes = readFileSync(join('fixtures/midi-corpus', file))
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const events = collectChannelMidiEvents(buffer)
const midi = new Midi(buffer)

const noteChannels = new Set<number>()
for (const track of midi.tracks) {
  if (track.notes.length > 0) noteChannels.add(track.channel)
}

for (const entry of events) {
  const ccTicks = entry.controlChanges.map((c) => c.ticks)
  const uniqueTicks = [...new Set(ccTicks)]
  console.log(
    `ch ${entry.channel} notes=${noteChannels.has(entry.channel)} cc=${entry.controlChanges.length} uniqueTicks=${uniqueTicks.slice(0, 8).join(',')}${uniqueTicks.length > 8 ? '...' : ''}`,
  )
}
