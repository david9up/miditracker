import { parseMidi } from 'midi-file'
import type { MidiEvent } from 'midi-file'

export interface MidiControlEvent {
  ticks: number
  channel: number
  number: number
  value: number
}

export interface MidiProgramChangeEvent {
  ticks: number
  channel: number
  program: number
}

export interface ChannelMidiEvents {
  channel: number
  controlChanges: MidiControlEvent[]
  programChanges: MidiProgramChangeEvent[]
}

type TimedEvent = MidiEvent & { absoluteTime?: number; channel?: number }

function attachAbsoluteTimes(tracks: TimedEvent[][]): void {
  for (const track of tracks) {
    let currentTicks = 0
    for (const event of track) {
      currentTicks += event.deltaTime
      event.absoluteTime = currentTicks
    }
  }
}

export function collectChannelMidiEvents(buffer: ArrayBuffer): ChannelMidiEvents[] {
  const midiData = parseMidi(new Uint8Array(buffer))
  attachAbsoluteTimes(midiData.tracks as TimedEvent[][])

  const byChannel = new Map<number, ChannelMidiEvents>()

  function bucket(channel: number): ChannelMidiEvents {
    let entry = byChannel.get(channel)
    if (!entry) {
      entry = { channel, controlChanges: [], programChanges: [] }
      byChannel.set(channel, entry)
    }
    return entry
  }

  for (const track of midiData.tracks as TimedEvent[][]) {
    for (const event of track) {
      const channel = event.channel
      if (channel === undefined) continue

      if (event.type === 'controller') {
        bucket(channel).controlChanges.push({
          ticks: event.absoluteTime ?? 0,
          channel,
          number: event.controllerType,
          value: event.value,
        })
      }

      if (event.type === 'programChange') {
        bucket(channel).programChanges.push({
          ticks: event.absoluteTime ?? 0,
          channel,
          program: event.programNumber,
        })
      }
    }
  }

  return [...byChannel.values()].sort((a, b) => a.channel - b.channel)
}

export function rankCcNumbers(events: MidiControlEvent[]): number[] {
  const counts = new Map<number, number>()
  for (const event of events) {
    counts.set(event.number, (counts.get(event.number) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([number]) => number)
}
