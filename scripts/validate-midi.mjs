#!/usr/bin/env node
/** Exit 0 when a file parses with @tonejs/midi and midi-file. */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { Midi } = require('@tonejs/midi')
const { parseMidi } = require('midi-file')

const path = process.argv[2]
if (!path) process.exit(2)

try {
  const bytes = readFileSync(path)
  if (bytes.byteLength < 4 || bytes.toString('ascii', 0, 4) !== 'MThd') {
    process.exit(1)
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const midi = new Midi(buffer)
  parseMidi(new Uint8Array(buffer))

  const noteCount = midi.tracks.reduce((total, track) => total + track.notes.length, 0)
  if (noteCount === 0) process.exit(1)

  process.exit(0)
} catch {
  process.exit(1)
}
