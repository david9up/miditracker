import { importMidiBuffer } from '@/lib/midi/import-midi'
import { extractMidiReference, type MidiReferenceProfile } from '@/lib/midi/midi-reference'
import type { MidiImportReport } from '@/lib/types'
import { MAX_MIDI_CHANNELS } from '@/lib/midi/channels'

export interface MidiCompareMismatch {
  field: string
  expected: string | number
  actual: string | number
  detail?: string
}

export interface MidiCompareResult {
  filename: string | null
  reference: MidiReferenceProfile
  report: MidiImportReport
  sourceNoteCount: number
  importedNoteCount: number
  droppedNoteCount: number
  mismatches: MidiCompareMismatch[]
  ok: boolean
}

const DURATION_TOLERANCE_SECONDS = 0.05

function pushMismatch(
  mismatches: MidiCompareMismatch[],
  field: string,
  expected: string | number,
  actual: string | number,
  detail?: string,
): void {
  mismatches.push({ field, expected, actual, detail })
}

/** Compare our import report against independent MIDI reference parsers. */
export function compareMidiImport(
  buffer: ArrayBuffer,
  filename?: string,
): MidiCompareResult {
  const reference = extractMidiReference(buffer)
  const { report } = importMidiBuffer(buffer, undefined, {
    sourceFilename: filename,
  })

  const sourceNoteCount = report.channelMap.reduce((total, entry) => total + entry.noteCount, 0)
  const importedNoteCount = report.noteCount
  const importedMidiChannels = new Set(report.channelMap.map((entry) => entry.channel - 1))
  let droppedNoteCount = 0
  for (const [channel, count] of Object.entries(reference.notesByChannel)) {
    if (!importedMidiChannels.has(Number(channel))) {
      droppedNoteCount += count
    }
  }
  const mismatches: MidiCompareMismatch[] = []

  if (report.ppq !== reference.ppq) {
    pushMismatch(mismatches, 'ppq', reference.ppq, report.ppq)
  }

  if (Math.abs(report.durationSeconds - reference.durationSeconds) > DURATION_TOLERANCE_SECONDS) {
    pushMismatch(
      mismatches,
      'durationSeconds',
      reference.durationSeconds.toFixed(3),
      report.durationSeconds.toFixed(3),
    )
  }

  if (sourceNoteCount !== reference.tonejsNoteCount && report.droppedChannels === 0) {
    pushMismatch(
      mismatches,
      'sourceNoteCount',
      reference.tonejsNoteCount,
      sourceNoteCount,
      'channelMap note totals should match @tonejs/midi when no channels are dropped',
    )
  }

  if (importedNoteCount + report.skippedNotes !== sourceNoteCount) {
    pushMismatch(
      mismatches,
      'placedNotes',
      sourceNoteCount,
      importedNoteCount + report.skippedNotes,
      'placed + skipped notes should equal source notes on imported channels',
    )
  }

  if (reference.rawNoteOnCount > 0 && reference.tonejsNoteCount === 0) {
    pushMismatch(
      mismatches,
      'tonejsNoteCount',
      reference.rawNoteOnCount,
      reference.tonejsNoteCount,
      '@tonejs/midi found no notes despite raw noteOn events',
    )
  }

  const expectedChannelsUsed = Math.min(
    MAX_MIDI_CHANNELS,
    new Set([
      ...reference.channelsWithNotes,
      ...Object.keys(reference.notesByChannel).map(Number),
    ]).size,
  )

  if (report.droppedChannels === 0 && report.channelsUsed !== expectedChannelsUsed) {
    // Event-only channels (CC/program with no notes) can increase channelsUsed beyond note channels.
    const noteChannelCount = reference.channelsWithNotes.length
    if (report.channelsUsed < noteChannelCount) {
      pushMismatch(
        mismatches,
        'channelsUsed',
        noteChannelCount,
        report.channelsUsed,
        'fewer imported channels than channels with notes',
      )
    }
  }

  if (report.droppedChannels > 0 && droppedNoteCount > 0) {
    const expectedDropped = Object.keys(reference.notesByChannel).length - report.channelsUsed
    if (report.droppedChannels < expectedDropped && expectedDropped > 0) {
      pushMismatch(
        mismatches,
        'droppedChannels',
        expectedDropped,
        report.droppedChannels,
        'note-bearing channels exceeded the 8-track limit',
      )
    }
  }

  if (report.programChangeCount > reference.programChangeCount) {
    pushMismatch(
      mismatches,
      'programChangeCount',
      reference.programChangeCount,
      report.programChangeCount,
      'import counted more program changes than midi-file raw events',
    )
  }

  return {
    filename: filename ?? null,
    reference,
    report,
    sourceNoteCount,
    importedNoteCount,
    droppedNoteCount,
    mismatches,
    ok: mismatches.length === 0,
  }
}
