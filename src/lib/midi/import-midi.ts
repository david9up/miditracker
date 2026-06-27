/**
 * Standard MIDI → Tracker+ pattern conversion.
 *
 * Pipeline: parse channels → pick up to 8 tracks → quantize notes/CC/PC →
 * apply tempo map and pattern splits → build import report.
 *
 * Tracker+ allows one note per row per track; chord stacks spill to nearby
 * rows before they count as skipped in the report.
 */
import { Midi } from '@tonejs/midi'
import { parseMidi, writeMidi } from 'midi-file'
import {
  gmProgramName,
  instrumentIdForMidiChannel,
  MAX_MIDI_CHANNELS,
  midiChannelLabel,
  trackerMidiSlotForChannel,
} from '@/lib/midi/channels'
import { collectChannelMidiEvents, rankCcNumbers } from '@/lib/midi/midi-events'
import { diagnoseMidiBuffer, formatMidiImportError } from '@/lib/midi/midi-diagnose'
import {
  buildFxMappings,
  mappingForCc,
  mappingForProgramChange,
  VOLUME_CC,
} from '@/lib/midi/midi-fx'
import type {
  MidiChannelCandidate,
  MidiChannelMapEntry,
  MidiConversionResult,
  MidiImportOptions,
  MidiImportProgressCallback,
  MidiImportReport,
  MidiInstrument,
  Pattern,
  Step,
  TrackerSong,
} from '@/lib/types'
import {
  EMPTY_NOTE,
  MAX_PATTERN_LENGTH,
  MIN_PATTERN_LENGTH,
  ROWS_PER_BEAT,
  TRACK_COUNT,
} from '@/lib/types'
import { repartitionPatterns } from '@/lib/midi/pattern-split'
import {
  buildTempoMap,
  bpmToTempoFxValue,
  tempoChangesForFx,
  TEMPO_FX_INDEX,
  ticksToRow,
} from '@/lib/midi/tempo-map'
import { clampNote } from '@/lib/utils'

interface ChannelNotes {
  channel: number
  notes: Array<{ ticks: number; midi: number; velocity: number }>
  program: number
  trackName: string
  percussion: boolean
}

function createEmptyStep(): Step {
  return {
    note: EMPTY_NOTE,
    instrument: 0,
    volume: 0,
    fx1Type: 0,
    fx1Value: 0,
    fx2Type: 0,
    fx2Value: 0,
  }
}

function createEmptyPattern(name: string, length: number): Pattern {
  return {
    name,
    length,
    tracks: Array.from({ length: TRACK_COUNT }, () =>
      Array.from({ length }, () => createEmptyStep()),
    ),
  }
}

function roundPatternLength(rowCount: number): number {
  const padded = Math.ceil(rowCount / MIN_PATTERN_LENGTH) * MIN_PATTERN_LENGTH
  return Math.min(MAX_PATTERN_LENGTH, Math.max(MIN_PATTERN_LENGTH, padded))
}

function patternPartName(index: number, total: number): string {
  if (total <= 1) return 'Pattern 01'
  const startRow = index * MAX_PATTERN_LENGTH + 1
  const endRow = (index + 1) * MAX_PATTERN_LENGTH
  return `Part ${String(index + 1).padStart(2, '0')} (rows ${startRow}-${endRow})`
}

function formatTimeSignature(midi: Midi): string | null {
  const signature = midi.header.timeSignatures[0]
  if (!signature) return null
  return `${signature.timeSignature[0]}/${signature.timeSignature[1]}`
}

function droppedChannelLabel(bucket: ChannelNotes): string {
  return midiChannelLabel(
    bucket.channel,
    bucket.percussion ? 128 : bucket.program,
    bucket.trackName || (bucket.percussion ? 'Drums' : gmProgramName(bucket.program)),
  )
}

function collectChannelNotes(midi: Midi): ChannelNotes[] {
  const byChannel = new Map<number, ChannelNotes>()

  for (const track of midi.tracks) {
    if (track.notes.length === 0) continue

    const channel = track.channel
    let bucket = byChannel.get(channel)
    if (!bucket) {
      bucket = {
        channel,
        notes: [],
        program: track.instrument?.number ?? 0,
        trackName: track.name?.trim() ?? '',
        percussion: track.instrument?.percussion ?? channel === 9,
      }
      byChannel.set(channel, bucket)
    }

    if (track.name?.trim() && !bucket.trackName) {
      bucket.trackName = track.name.trim()
    }

    if (track.instrument?.number !== undefined) {
      bucket.program = track.instrument.number
      bucket.percussion = track.instrument.percussion ?? bucket.percussion
    }

    for (const note of track.notes) {
      bucket.notes.push({
        ticks: note.ticks,
        midi: note.midi,
        velocity: note.velocity,
      })
    }
  }

  return [...byChannel.values()]
    .filter((item) => item.notes.length > 0)
    .sort((a, b) => b.notes.length - a.notes.length)
}

export function listMidiChannelCandidates(buffer: ArrayBuffer): MidiChannelCandidate[] {
  const diagnostic = diagnoseMidiBuffer(buffer)
  if (!diagnostic.ok) {
    throw new Error(
      diagnostic.detail ? `${diagnostic.message} (${diagnostic.detail})` : diagnostic.message,
    )
  }

  let midi: Midi
  try {
    midi = new Midi(buffer)
  } catch (cause) {
    throw new Error(formatMidiImportError(buffer, cause))
  }

  return collectChannelNotes(midi).map((bucket) => ({
    channel: bucket.channel,
    noteCount: bucket.notes.length,
    label: droppedChannelLabel(bucket),
    program: bucket.program,
    percussion: bucket.percussion,
  }))
}

function resolveUsedChannels(
  channelBuckets: ChannelNotes[],
  eventOnlyChannels: ChannelNotes[],
  selectedChannels?: number[],
): { usedChannels: ChannelNotes[]; droppedBuckets: ChannelNotes[] } {
  // Pre-import picker: honour user selection (still capped at 8).
  if (selectedChannels && selectedChannels.length > 0) {
    const selected = selectedChannels.slice(0, MAX_MIDI_CHANNELS)
    const selectedSet = new Set(selected)
    const usedChannels = selected
      .map((channel) => {
        const fromNotes = channelBuckets.find((bucket) => bucket.channel === channel)
        if (fromNotes) return fromNotes
        return eventOnlyChannels.find((bucket) => bucket.channel === channel)
      })
      .filter((bucket): bucket is ChannelNotes => bucket !== undefined)

    const droppedBuckets = channelBuckets.filter((bucket) => !selectedSet.has(bucket.channel))
    return { usedChannels, droppedBuckets }
  }

  const noteChannels = channelBuckets.slice(0, MAX_MIDI_CHANNELS)
  // Default: keep the busiest note channels; CC-only channels fill gaps if needed.
  const usedChannels =
    noteChannels.length > 0
      ? noteChannels
      : eventOnlyChannels.slice(0, MAX_MIDI_CHANNELS)

  const droppedBuckets =
    noteChannels.length > 0
      ? channelBuckets.slice(MAX_MIDI_CHANNELS)
      : eventOnlyChannels.slice(MAX_MIDI_CHANNELS)

  return { usedChannels, droppedBuckets }
}

function ensurePatternRow(
  patterns: Pattern[],
  globalRow: number,
): { pattern: Pattern; rowInPattern: number } {
  const patternIndex = Math.floor(globalRow / MAX_PATTERN_LENGTH)
  while (patterns.length <= patternIndex) {
    patterns.push(
      createEmptyPattern(
        `Pattern ${String(patterns.length + 1).padStart(2, '0')}`,
        MAX_PATTERN_LENGTH,
      ),
    )
  }

  const pattern = patterns[patternIndex]!
  return { pattern, rowInPattern: globalRow % MAX_PATTERN_LENGTH }
}

function applyFx(step: Step, fxType: number, fxValue: number): boolean {
  // Each step has two FX slots; updating an existing type replaces its value.
  if (fxType <= 0) return true

  if (step.fx1Type === 0) {
    step.fx1Type = fxType
    step.fx1Value = fxValue
    return true
  }

  if (step.fx2Type === 0 && step.fx1Type !== fxType) {
    step.fx2Type = fxType
    step.fx2Value = fxValue
    return true
  }

  if (step.fx1Type === fxType) {
    step.fx1Value = fxValue
    return true
  }

  if (step.fx2Type === fxType) {
    step.fx2Value = fxValue
    return true
  }

  return false
}

function stepAcceptsNote(step: Step | undefined): boolean {
  return step !== undefined && step.note === EMPTY_NOTE
}

/**
 * Find a free row for a note on one track.
 *
 * Search order keeps timing musically close to the quantize target:
 * 1. Exact row
 * 2. Other rows in the same 4-row beat (helps chord stacks on one channel)
 * 3. Up to {@link maxSpill} rows forward when the beat is full
 */
export function findNotePlacementRow(
  patterns: Pattern[],
  trackIndex: number,
  targetRow: number,
  maxSpill = 3,
): number | null {
  const canPlaceAt = (row: number): boolean => {
    if (row < 0) return false
    const { pattern, rowInPattern } = ensurePatternRow(patterns, row)
    return stepAcceptsNote(pattern.tracks[trackIndex]?.[rowInPattern])
  }

  if (canPlaceAt(targetRow)) return targetRow

  const beatStart = Math.floor(targetRow / ROWS_PER_BEAT) * ROWS_PER_BEAT
  const beatEnd = beatStart + ROWS_PER_BEAT - 1

  for (let offset = 1; offset < ROWS_PER_BEAT; offset++) {
    const after = targetRow + offset
    if (after <= beatEnd && canPlaceAt(after)) return after

    const before = targetRow - offset
    if (before >= beatStart && canPlaceAt(before)) return before
  }

  for (let spill = 1; spill <= maxSpill; spill++) {
    const forward = targetRow + spill
    if (canPlaceAt(forward)) return forward
  }

  return null
}

function placeNote(
  patterns: Pattern[],
  trackIndex: number,
  globalRow: number,
  midiNote: number,
  velocity: number,
  instrumentId: number,
): boolean {
  const placementRow = findNotePlacementRow(patterns, trackIndex, globalRow)
  if (placementRow === null) return false

  const { pattern, rowInPattern } = ensurePatternRow(patterns, placementRow)
  const step = pattern.tracks[trackIndex]?.[rowInPattern]
  if (!step) return false

  step.note = clampNote(midiNote)
  step.instrument = instrumentId
  step.volume = Math.max(1, Math.round(velocity * 100))
  return true
}

function placeFxEvent(
  patterns: Pattern[],
  trackIndex: number,
  globalRow: number,
  instrumentId: number,
  fxType: number,
  fxValue: number,
): boolean {
  const { pattern, rowInPattern } = ensurePatternRow(patterns, globalRow)
  const step = pattern.tracks[trackIndex]?.[rowInPattern]
  if (!step) return false

  if (step.instrument <= 0) {
    step.instrument = instrumentId
  }

  return applyFx(step, fxType, fxValue)
}

function trimPatternTail(pattern: Pattern): Pattern {
  let lastRow = -1
  for (let row = pattern.length - 1; row >= 0; row--) {
    for (const track of pattern.tracks) {
      const step = track[row]
      if (
        step &&
        (step.note !== EMPTY_NOTE || step.fx1Type > 0 || step.fx2Type > 0 || step.volume > 0)
      ) {
        lastRow = row
        break
      }
    }
    if (lastRow >= 0) break
  }

  if (lastRow < 0) {
    return { ...pattern, length: MIN_PATTERN_LENGTH }
  }

  const length = roundPatternLength(lastRow + 1)
  return {
    ...pattern,
    length,
    tracks: pattern.tracks.map((track) => track.slice(0, length)),
  }
}

function filenameStem(filename: string): string {
  return filename.replace(/\.(mid|midi)$/i, '').trim()
}

function isGenericMidiTitle(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return true
  if (/^imported\s*midi$/i.test(trimmed)) return true
  if (trimmed.toLowerCase() === 'untitled') return true
  return false
}

export function resolveImportTitle(
  midiName: string | undefined,
  sourceFilename?: string,
): { title: string; sourceFilename: string | null } {
  // Prefer a meaningful filename stem over generic embedded MIDI titles.
  const source = sourceFilename?.trim() || null
  const metaName = midiName?.trim() ?? ''
  const stem = source ? filenameStem(source) : ''

  if (isGenericMidiTitle(metaName) && stem) {
    return { title: stem, sourceFilename: source }
  }

  if (metaName) {
    return { title: metaName, sourceFilename: source }
  }

  return { title: stem || 'Imported MIDI', sourceFilename: source }
}

export function importMidiBuffer(
  buffer: ArrayBuffer,
  onProgress?: MidiImportProgressCallback,
  options?: MidiImportOptions,
): MidiConversionResult {
  onProgress?.({ step: 'reading', message: 'Reading MIDI file…' })

  const diagnostic = diagnoseMidiBuffer(buffer)
  if (!diagnostic.ok) {
    throw new Error(
      diagnostic.detail ? `${diagnostic.message} (${diagnostic.detail})` : diagnostic.message,
    )
  }

  let midi: Midi
  try {
    midi = new Midi(buffer)
  } catch (cause) {
    throw new Error(formatMidiImportError(buffer, cause))
  }

  onProgress?.({ step: 'parsing', message: 'Parsing tracks, CC, and program changes…' })

  const channelBuckets = collectChannelNotes(midi)
  const channelEvents = collectChannelMidiEvents(buffer)
  const eventOnlyChannels = channelEvents
    .filter((entry) => !channelBuckets.some((bucket) => bucket.channel === entry.channel))
    .filter(
      (entry) => entry.controlChanges.length > 0 || entry.programChanges.length > 0,
    )
    .map((entry) => ({
      channel: entry.channel,
      notes: [] as ChannelNotes['notes'],
      program: 0,
      trackName: '',
      percussion: entry.channel === 9,
    }))

  const { usedChannels, droppedBuckets } = resolveUsedChannels(
    channelBuckets,
    eventOnlyChannels,
    options?.selectedChannels,
  )
  const droppedChannels = droppedBuckets.length

  if (
    usedChannels.length === 0 &&
    channelEvents.every(
      (entry) => entry.controlChanges.length === 0 && entry.programChanges.length === 0,
    )
  ) {
    throw new Error('MIDI file has no note or controller events')
  }

  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 120)
  const ppq = midi.header.ppq
  const tempoMap = buildTempoMap(midi.header.tempos, ppq)
  const tempoChangeCount = Math.max(0, tempoMap.length - 1)
  const timeSignature = formatTimeSignature(midi)

  const channelEventByNumber = new Map(channelEvents.map((entry) => [entry.channel, entry]))
  const fxMappingsByChannel = new Map<number, ReturnType<typeof buildFxMappings>>()

  let ccEventCount = 0
  let programChangeCount = 0
  let mappedFxCount = 0
  let skippedFxEvents = 0

  for (const bucket of usedChannels) {
    const events = channelEventByNumber.get(bucket.channel)
    ccEventCount += events?.controlChanges.length ?? 0
    programChangeCount += events?.programChanges.length ?? 0

    const mapping = buildFxMappings({
      ccNumbers: rankCcNumbers(events?.controlChanges ?? []),
      hasProgramChanges: (events?.programChanges.length ?? 0) > 0,
    })
    fxMappingsByChannel.set(bucket.channel, mapping)
    mappedFxCount += mapping.length
  }

  onProgress?.({ step: 'quantizing', message: 'Quantizing notes and MIDI controllers…' })

  // --- Place notes and controller events onto the grid ---
  const patterns: Pattern[] = []
  let noteCount = 0
  let skippedNotes = 0

  usedChannels.forEach((bucket, trackIndex) => {
    const instrumentId = instrumentIdForMidiChannel(bucket.channel)
    const fxMapping = fxMappingsByChannel.get(bucket.channel) ?? []

    for (const note of bucket.notes) {
      const globalRow = ticksToRow(note.ticks, ppq)
      const placed = placeNote(
        patterns,
        trackIndex,
        globalRow,
        note.midi,
        note.velocity,
        instrumentId,
      )
      if (placed) noteCount++
      else skippedNotes++
    }

    const events = channelEventByNumber.get(bucket.channel)
    if (!events) return

    for (const cc of events.controlChanges) {
      const globalRow = ticksToRow(cc.ticks, ppq)
      const { pattern, rowInPattern } = ensurePatternRow(patterns, globalRow)
      const step = pattern.tracks[trackIndex]?.[rowInPattern]
      if (!step) {
        skippedFxEvents++
        continue
      }

      if (cc.number === VOLUME_CC) {
        if (step.instrument <= 0) step.instrument = instrumentId
        step.volume = Math.max(1, Math.min(100, cc.value))
        continue
      }

      const mapping = mappingForCc(fxMapping, cc.number)
      if (!mapping) {
        skippedFxEvents++
        continue
      }

      const placed = placeFxEvent(
        patterns,
        trackIndex,
        globalRow,
        instrumentId,
        mapping.fxIndex,
        cc.value,
      )
      if (!placed) skippedFxEvents++
    }

    const pcMapping = mappingForProgramChange(fxMapping)
    for (const pc of events.programChanges) {
      if (!pcMapping) {
        skippedFxEvents++
        continue
      }

      const globalRow = ticksToRow(pc.ticks, ppq)
      const placed = placeFxEvent(
        patterns,
        trackIndex,
        globalRow,
        instrumentId,
        pcMapping.fxIndex,
        pc.program,
      )
      if (!placed) skippedFxEvents++
    }
  })

  onProgress?.({ step: 'building', message: 'Applying tempo map and building patterns…' })

  const trimmedPatterns = patterns.map(trimPatternTail)
  if (trimmedPatterns.length === 0) {
    trimmedPatterns.push(createEmptyPattern('Pattern 01', MIN_PATTERN_LENGTH))
  }

  const tempoSplitRows = tempoMap.filter((entry) => entry.patternSplit).map((entry) => entry.row)
  const processedPatterns = repartitionPatterns(trimmedPatterns, tempoSplitRows)

  let tempoFxPlaced = 0
  for (const change of tempoChangesForFx(tempoMap)) {
    let offset = 0
    for (const pattern of processedPatterns) {
      if (change.row >= offset && change.row < offset + pattern.length) {
        const step = pattern.tracks[0]?.[change.row - offset]
        if (step && applyFx(step, TEMPO_FX_INDEX, bpmToTempoFxValue(change.bpm))) {
          tempoFxPlaced++
        }
        break
      }
      offset += pattern.length
    }
  }

  const namedPatterns = processedPatterns.map((pattern, index) => ({
    ...pattern,
    name: patternPartName(index, processedPatterns.length),
  }))

  const channelMap: MidiChannelMapEntry[] = usedChannels.map((bucket, trackIndex) => {
    const instrumentId = instrumentIdForMidiChannel(bucket.channel)
    const fxMapping = fxMappingsByChannel.get(bucket.channel) ?? []
    const name = midiChannelLabel(
      bucket.channel,
      bucket.percussion ? 128 : bucket.program,
      bucket.trackName || (bucket.percussion ? 'Drums' : gmProgramName(bucket.program)),
    )
    return {
      track: trackIndex + 1,
      channel: bucket.channel + 1,
      instrumentId,
      trackerSlot: trackerMidiSlotForChannel(bucket.channel),
      name,
      noteCount: bucket.notes.length,
      fxMapping,
    }
  })

  const instruments: MidiInstrument[] = usedChannels.map((bucket) => {
    const instrumentId = instrumentIdForMidiChannel(bucket.channel)
    const program = bucket.percussion ? 128 : bucket.program
    const fxMapping = fxMappingsByChannel.get(bucket.channel) ?? []
    return {
      id: instrumentId,
      name: midiChannelLabel(
        bucket.channel,
        program,
        bucket.trackName || (bucket.percussion ? 'Drums' : gmProgramName(bucket.program)),
      ),
      sourceChannel: bucket.channel,
      program,
      trackerSlot: trackerMidiSlotForChannel(bucket.channel),
      fxMapping,
    }
  })

  const { title, sourceFilename } = resolveImportTitle(midi.name, options?.sourceFilename)

  const song: TrackerSong = {
    title,
    bpm,
    ppq,
    patterns: namedPatterns,
    instruments,
    songOrder: namedPatterns.map((_, index) => index),
    tempoMap,
  }

  const report: MidiImportReport = {
    title,
    sourceFilename,
    channelCount: TRACK_COUNT,
    channelsUsed: usedChannels.length,
    patternCount: namedPatterns.length,
    instrumentCount: instruments.length,
    noteCount,
    ppq,
    durationSeconds: midi.duration,
    droppedChannels,
    droppedChannelNames: droppedBuckets.map(droppedChannelLabel),
    channelMap,
    skippedNotes,
    tempoChangeCount,
    timeSignature,
    ccEventCount,
    programChangeCount,
    mappedFxCount,
    skippedFxEvents,
    tempoMap,
    tempoFxPlaced,
  }

  return { song, report }
}

export function createTestMidiBuffer(options?: {
  bpm?: number
  channel?: number
  program?: number
  notes?: Array<{ midi: number; ticks: number; durationTicks?: number; velocity?: number }>
  controlChanges?: Array<{ ticks: number; number: number; value?: number }>
  programChanges?: Array<{ ticks: number; program: number }>
}): ArrayBuffer {
  const midi = new Midi()
  midi.header.setTempo(options?.bpm ?? 120)
  const track = midi.addTrack()
  const channel = options?.channel ?? 0
  track.channel = channel
  track.instrument.number = options?.program ?? 0

  const notes = options?.notes ?? [
    { midi: 60, ticks: 0, durationTicks: midi.header.ppq },
    { midi: 64, ticks: midi.header.ppq, durationTicks: midi.header.ppq },
    { midi: 67, ticks: midi.header.ppq * 2, durationTicks: midi.header.ppq },
  ]

  for (const note of notes) {
    track.addNote({
      midi: note.midi,
      ticks: note.ticks,
      durationTicks: note.durationTicks ?? midi.header.ppq / 2,
      velocity: note.velocity ?? 0.9,
    })
  }

  for (const cc of options?.controlChanges ?? []) {
    track.addCC({
      number: cc.number,
      ticks: cc.ticks,
      value: (cc.value ?? 100) / 127,
    })
  }

  const bytes = midi.toArray()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)

  if ((options?.programChanges?.length ?? 0) === 0) {
    return copy.buffer
  }

  return injectProgramChanges(copy.buffer, channel, options!.programChanges!)
}

/** Build a MIDI file with independent note data on multiple channels (for limit tests). */
export function createMultiChannelTestMidiBuffer(
  channelSpecs: Array<{ channel: number; noteCount: number; program?: number }>,
): ArrayBuffer {
  const midi = new Midi()
  midi.header.setTempo(120)
  const ppq = midi.header.ppq

  for (const spec of channelSpecs) {
    const track = midi.addTrack()
    track.channel = spec.channel
    track.instrument.number = spec.program ?? spec.channel
    track.name = `Ch${spec.channel + 1}`

    for (let index = 0; index < spec.noteCount; index++) {
      track.addNote({
        midi: 60 + (spec.channel % 12),
        ticks: index * ppq,
        durationTicks: ppq / 2,
        velocity: 0.8,
      })
    }
  }

  const bytes = midi.toArray()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function injectProgramChanges(
  buffer: ArrayBuffer,
  channel: number,
  programChanges: Array<{ ticks: number; program: number }>,
): ArrayBuffer {
  const midiData = parseMidi(new Uint8Array(buffer))
  const targetTrack = midiData.tracks.find((track) =>
    track.some((event) => 'channel' in event && event.channel === channel),
  ) ?? midiData.tracks[0]

  if (!targetTrack) {
    return buffer
  }

  type TimedEvent = (typeof targetTrack)[number] & { absoluteTime: number }

  const timed: TimedEvent[] = []
  let currentTicks = 0
  for (const event of targetTrack) {
    currentTicks += event.deltaTime
    timed.push({ ...event, absoluteTime: currentTicks })
  }

  for (const pc of programChanges) {
    timed.push({
      deltaTime: 0,
      absoluteTime: pc.ticks,
      type: 'programChange',
      channel,
      programNumber: pc.program,
    })
  }

  timed.sort((a, b) => a.absoluteTime - b.absoluteTime)

  const rebuilt: typeof targetTrack = []
  let previousTicks = 0
  for (const event of timed) {
    const { absoluteTime, ...rest } = event
    rebuilt.push({
      ...rest,
      deltaTime: Math.max(0, absoluteTime - previousTicks),
    } as (typeof targetTrack)[number])
    previousTicks = absoluteTime
  }

  const trackIndex = midiData.tracks.indexOf(targetTrack)
  midiData.tracks[trackIndex] = rebuilt

  const bytes = writeMidi(midiData)
  return Uint8Array.from(bytes).buffer
}

export function isMidiImportReport(
  report: MidiImportReport | { sourceFormat: string },
): report is MidiImportReport {
  return 'ccEventCount' in report
}
