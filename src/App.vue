<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import AboutDialog from '@/components/AboutDialog.vue'
import ChannelPanel from '@/components/ChannelPanel.vue'
import ChannelPickerDialog from '@/components/ChannelPickerDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import KeyboardHelpPanel from '@/components/KeyboardHelpPanel.vue'
import MenuBar from '@/components/MenuBar.vue'
import PatternEditor from '@/components/PatternEditor.vue'
import SidebarDetails from '@/components/SidebarDetails.vue'
import SaveAsDialog from '@/components/SaveAsDialog.vue'
import StatusBar from '@/components/StatusBar.vue'
import TransportBar from '@/components/TransportBar.vue'
import { blankReport, createBlankSong } from '@/lib/blank-song'
import { createSampleSong, reportForSampleSong } from '@/lib/sample-song'
import {
  saveAllPatternsInteractive,
  saveProjectZipInteractive,
} from '@/lib/export/save-file'
import {
  saveGridMidiReferenceInteractive,
  saveSourceMidiInteractive,
} from '@/lib/export/export-midi'
import { importMidiBuffer, listMidiChannelCandidates } from '@/lib/midi/import-midi'
import { openChannelPickerDialog } from '@/lib/channel-picker-state'
import { openConfirmDialog } from '@/lib/confirm-dialog-state'
import { validateSongExport } from '@/lib/export/validate-export'
import type { ExportValidationResult } from '@/lib/export/validate-export'
import type { MidiImportReport, Step, TrackerSong } from '@/lib/types'
import { patternPlayback, previewNote } from '@/lib/pattern-playback'
import {
  createDefaultTransportOptions,
  toggleTrackMute as flipTrackMute,
  toggleTrackSolo as flipTrackSolo,
} from '@/lib/transport-state'
import {
  gmSoundfont,
  instrumentLabelForTrack,
  compactInstrumentLabel,
  shortInstrumentLabel,
} from '@/lib/gm-soundfont'
import { clampSongBpm, resizePattern } from '@/lib/pattern-session'
import {
  applyHexDigit,
  clearColumn,
  clearStep,
  isNoteKey,
  KEY_TO_SEMITONE,
  moveEditColumn,
  semitoneToNote,
  setNoteOnStep,
  type EditColumn,
} from '@/lib/pattern-edit'
import { noteToString } from '@/lib/utils'
import { SongHistory } from '@/lib/history'
import {
  adjustOrderIndexAfterMove,
  appendSongOrderSlot,
  insertSongOrderSlot,
  moveSongOrderSlot,
  removeSongOrderSlot,
} from '@/lib/song-order'
import { APP_VERSION } from '@/app-version'
import { hasImportLossNotes } from '@/lib/import-loss'

// --- Root shell: song session, grid editing, import/export, GM preview ---

const history = new SongHistory()

const appVersion = APP_VERSION
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

// UI chrome
const loading = ref(false)
const dragActive = ref(false)
const showKeyboardHelp = ref(false)
const showAbout = ref(false)
const loaded = ref(false)

// Grid edit cursor (keyboard entry uses Z–M on note column)
const cursorRow = ref(0)
const cursorTrack = ref(0)
const cursorColumn = ref<EditColumn>('note')
const editBuffer = ref('')
const baseOctave = ref(4)
const selectedPattern = ref(0)
const selectedOrderIndex = ref(0)
const validation = ref<ExportValidationResult | null>(null)
const validationHighlight = ref(false)
const sidebarDetailsRef = useTemplateRef<{
  focusImportTab: () => void
  focusExportTab: () => void
}>('sidebarDetails')
const patternEditorRef = useTemplateRef<{ focusCursorCell: () => void }>('patternEditor')
const isPlaying = ref(false)
const canUndo = ref(false)
const canRedo = ref(false)
const playheadRow = ref(0)
const triggeredTracks = ref<boolean[]>(Array.from({ length: 8 }, () => false))
const soundfontReady = ref(false)
const transport = ref(createDefaultTransportOptions())

// Original file bytes for “Source MIDI” export; cleared on New song.
const sourceMidiBuffer = ref<ArrayBuffer | null>(null)
// Hides blank-grid overlay once user enters notes, loads sample, or imports.
const gridSessionStarted = ref(false)

const song = ref<TrackerSong>(createBlankSong())
const report = ref<MidiImportReport>(blankReport())
const statusMessage = ref('Ready — click a cell or use Z–M to enter notes')
const statusTone = ref<'info' | 'success' | 'warn' | 'error'>('info')

const currentPattern = computed(() => song.value.patterns[selectedPattern.value] ?? song.value.patterns[0]!)

const currentStep = computed<Step | null>(() => {
  const pattern = currentPattern.value
  if (!pattern) return null
  return pattern.tracks[cursorTrack.value]?.[cursorRow.value] ?? null
})

function syncHistoryState() {
  canUndo.value = history.canUndo()
  canRedo.value = history.canRedo()
}

function checkpoint() {
  history.checkpoint(song.value)
  syncHistoryState()
}

function clampSelectionAfterRestore() {
  if (selectedPattern.value >= song.value.patterns.length) {
    selectedPattern.value = 0
  }
  if (selectedOrderIndex.value >= song.value.songOrder.length) {
    selectedOrderIndex.value = Math.max(0, song.value.songOrder.length - 1)
  }
  const patternAtOrder = song.value.songOrder[selectedOrderIndex.value]
  if (patternAtOrder !== undefined) {
    selectedPattern.value = patternAtOrder
  }
  editBuffer.value = ''
}

function undoEdit() {
  if (loading.value || isPlaying.value) return
  const previous = history.undo(song.value)
  if (!previous) return
  song.value = previous
  clampSelectionAfterRestore()
  syncHistoryState()
  statusMessage.value = 'Undo'
  statusTone.value = 'info'
}

function redoEdit() {
  if (loading.value || isPlaying.value) return
  const next = history.redo(song.value)
  if (!next) return
  song.value = next
  clampSelectionAfterRestore()
  syncHistoryState()
  statusMessage.value = 'Redo'
  statusTone.value = 'info'
}

function selectOrderSlot(orderIndex: number) {
  const patternIndex = song.value.songOrder[orderIndex]
  if (patternIndex === undefined) return
  if (isPlaying.value) stopPlayback(false)
  selectedOrderIndex.value = orderIndex
  selectedPattern.value = patternIndex
  resetEditCursor()
}

function reorderSongOrder(from: number, to: number) {
  checkpoint()
  song.value.songOrder = moveSongOrderSlot(song.value.songOrder, from, to)
  selectedOrderIndex.value = adjustOrderIndexAfterMove(selectedOrderIndex.value, from, to)
  selectedPattern.value = song.value.songOrder[selectedOrderIndex.value] ?? 0
}

function moveOrderUp(orderIndex: number) {
  if (orderIndex <= 0) return
  reorderSongOrder(orderIndex, orderIndex - 1)
}

function moveOrderDown(orderIndex: number) {
  if (orderIndex >= song.value.songOrder.length - 1) return
  reorderSongOrder(orderIndex, orderIndex + 1)
}

function duplicateOrderSlot(orderIndex: number) {
  const patternIndex = song.value.songOrder[orderIndex]
  if (patternIndex === undefined) return
  checkpoint()
  song.value.songOrder = insertSongOrderSlot(song.value.songOrder, orderIndex + 1, patternIndex)
  selectOrderSlot(orderIndex + 1)
}

function removeOrderSlot(orderIndex: number) {
  if (song.value.songOrder.length <= 1) return
  checkpoint()
  song.value.songOrder = removeSongOrderSlot(song.value.songOrder, orderIndex)
  if (selectedOrderIndex.value >= song.value.songOrder.length) {
    selectedOrderIndex.value = song.value.songOrder.length - 1
  } else if (selectedOrderIndex.value > orderIndex) {
    selectedOrderIndex.value -= 1
  }
  selectedPattern.value = song.value.songOrder[selectedOrderIndex.value] ?? 0
  editBuffer.value = ''
}

function appendToSongOrder(patternIndex: number) {
  checkpoint()
  song.value.songOrder = appendSongOrderSlot(song.value.songOrder, patternIndex)
  selectOrderSlot(song.value.songOrder.length - 1)
}

function resetEditCursor() {
  cursorRow.value = 0
  cursorTrack.value = 0
  cursorColumn.value = 'note'
  editBuffer.value = ''
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function selectCell(row: number, track: number, column?: EditColumn) {
  const pattern = currentPattern.value
  if (!pattern) return

  cursorRow.value = Math.max(0, Math.min(pattern.length - 1, row))
  cursorTrack.value = Math.max(0, Math.min(7, track))
  if (column) {
    cursorColumn.value = column
  }
  editBuffer.value = ''
}

function moveCursor(deltaRow: number, deltaTrack: number, deltaColumn = 0) {
  const pattern = currentPattern.value
  if (!pattern) return

  const nextColumn = moveEditColumn(cursorColumn.value, deltaColumn)
  selectCell(cursorRow.value + deltaRow, cursorTrack.value + deltaTrack, nextColumn)
}

function setNote(note: number, preview = true) {
  const step = currentStep.value
  if (!step) return

  checkpoint()
  setNoteOnStep(step, note)
  if (preview) {
    void previewNote(
      song.value,
      cursorTrack.value,
      step.note,
      step.volume > 0 ? step.volume : 72,
      step.instrument,
    )
  }
}

function clearCurrentStep() {
  const step = currentStep.value
  if (!step) return
  checkpoint()
  clearStep(step)
  editBuffer.value = ''
}

function clearCurrentColumn() {
  const step = currentStep.value
  if (!step) return
  checkpoint()
  clearColumn(step, cursorColumn.value)
  editBuffer.value = ''
}

function handleNoteKey(code: string) {
  const semitone = KEY_TO_SEMITONE[code]
  if (semitone === undefined) return

  setNote(semitoneToNote(semitone, baseOctave.value))
  moveCursor(1, 0)
}

function handleDigit(digit: string) {
  const step = currentStep.value
  if (!step) return

  if (editBuffer.value.length === 0) {
    checkpoint()
  }

  if (cursorColumn.value === 'volume') {
    const result = applyHexDigit(step, 'volume', editBuffer.value, digit)
    editBuffer.value = result.buffer
    if (result.advance) {
      moveCursor(0, 0, 1)
    }
    return
  }

  const result = applyHexDigit(step, cursorColumn.value, editBuffer.value, digit)
  editBuffer.value = result.buffer
  if (result.advance) {
    moveCursor(0, 0, 1)
  }
}

const patternTempoRows = computed(() => {
  let offset = 0
  for (let index = 0; index < selectedPattern.value; index++) {
    offset += song.value.patterns[index]?.length ?? 0
  }
  const end = offset + currentPattern.value.length
  return song.value.tempoMap
    .filter((entry) => entry.row >= offset && entry.row < end)
    .map((entry) => entry.row - offset)
})

const posLabel = computed(() => String(selectedOrderIndex.value + 1).padStart(3, '0'))

const octaveRangeLabel = computed(() => {
  const low = noteToString(semitoneToNote(0, baseOctave.value))
  const high = noteToString(semitoneToNote(12, baseOctave.value))
  return `${low}–${high}`
})

function octaveStatusMessage(): string {
  return `Octave ${baseOctave.value} (${octaveRangeLabel.value})`
}

const canPlay = computed(() =>
  song.value.patterns.some((pattern) =>
    pattern.tracks.some((track) => track.some((step) => step.note >= 0)),
  ),
)

const canExport = computed(() => canPlay.value && !loading.value)

const showBlankCta = computed(
  () => !loaded.value && !canPlay.value && !loading.value && !gridSessionStarted.value,
)

const hasSourceMidi = computed(() => sourceMidiBuffer.value !== null)

const previewLimited = computed(() => canPlay.value)

const trackLabels = computed(() =>
  Array.from({ length: 8 }, (_, trackIndex) => {
    const channelEntry = report.value.channelMap[trackIndex]
    const name = instrumentLabelForTrack(
      song.value,
      trackIndex,
      channelEntry?.name,
    )
    return {
      name,
      gridName: compactInstrumentLabel(name),
      shortName: shortInstrumentLabel(compactInstrumentLabel(name)),
    }
  }),
)

function setSongTitle(nextTitle: string) {
  if (isPlaying.value) return
  const title = nextTitle.trim() || 'Untitled'
  if (title === song.value.title) return
  checkpoint()
  song.value.title = title
  if (loaded.value) {
    report.value = { ...report.value, title }
  }
  statusMessage.value = `Song title: ${title}`
  statusTone.value = 'info'
}

function setSongBpm(nextBpm: number) {
  if (isPlaying.value) return
  const bpm = clampSongBpm(nextBpm)
  if (bpm === song.value.bpm) return
  checkpoint()
  song.value.bpm = bpm
  statusMessage.value = `BPM set to ${bpm}`
  statusTone.value = 'info'
}

function setPatternLength(nextLength: number) {
  if (isPlaying.value) return
  const patternIndex = selectedPattern.value
  const current = song.value.patterns[patternIndex]
  if (!current || current.length === nextLength) return

  checkpoint()
  song.value.patterns[patternIndex] = resizePattern(current, nextLength)
  if (cursorRow.value >= nextLength) {
    cursorRow.value = nextLength - 1
  }
  statusMessage.value = `Pattern length set to ${nextLength} rows`
  statusTone.value = 'info'
}

function stopPlayback(rewind = false) {
  patternPlayback.stop(false)
  isPlaying.value = false
  triggeredTracks.value = Array.from({ length: 8 }, () => false)
  if (rewind) {
    selectedOrderIndex.value = 0
    selectedPattern.value = song.value.songOrder[0] ?? 0
    cursorRow.value = 0
    playheadRow.value = 0
    statusMessage.value = 'Back to song start'
  } else {
    statusMessage.value = 'Stopped'
  }
  statusTone.value = 'info'
}

function rewindToStart() {
  if (isPlaying.value) {
    patternPlayback.pause()
    isPlaying.value = false
    triggeredTracks.value = Array.from({ length: 8 }, () => false)
  }
  selectedOrderIndex.value = 0
  selectedPattern.value = song.value.songOrder[0] ?? 0
  cursorRow.value = 0
  playheadRow.value = 0
  statusMessage.value = 'Song start'
  statusTone.value = 'info'
}

async function togglePlayback() {
  if (!canPlay.value || loading.value) return

  if (isPlaying.value) {
    patternPlayback.pause()
    isPlaying.value = false
    triggeredTracks.value = Array.from({ length: 8 }, () => false)
    statusMessage.value = 'Paused'
    statusTone.value = 'info'
    return
  }

  if (!soundfontReady.value) {
    statusMessage.value = 'Loading GM SoundFont…'
    statusTone.value = 'info'
  }

  try {
    await gmSoundfont.ensureContext()
    soundfontReady.value = true
  } catch {
    statusMessage.value = 'Could not initialize GM audio preview'
    statusTone.value = 'error'
    return
  }

  playheadRow.value = cursorRow.value

  await patternPlayback.start({
    song: song.value,
    startOrderIndex: selectedOrderIndex.value,
    startRow: cursorRow.value,
    transport: {
      loop: transport.value.loop,
      trackMutes: transport.value.trackMutes,
      soloTrack: transport.value.soloTrack,
    },
    onRow: (orderIndex, patternIndex, row, triggered) => {
      selectedOrderIndex.value = orderIndex
      selectedPattern.value = patternIndex
      cursorRow.value = row
      playheadRow.value = row
      triggeredTracks.value = triggered
    },
    onOrderChange: (orderIndex, patternIndex) => {
      selectedOrderIndex.value = orderIndex
      selectedPattern.value = patternIndex
      cursorRow.value = 0
      playheadRow.value = 0
      triggeredTracks.value = Array.from({ length: 8 }, () => false)
    },
    onFinish: () => {
      isPlaying.value = false
      triggeredTracks.value = Array.from({ length: 8 }, () => false)
      statusMessage.value = 'Playback finished'
      statusTone.value = 'info'
    },
  })

  isPlaying.value = true
  statusMessage.value = soundfontReady.value
    ? 'Playing GM SoundFont preview'
    : 'Playing preview'
  statusTone.value = 'info'
}

function openFilePicker() {
  if (loading.value) return
  fileInput.value?.click()
}

async function focusImportPanel() {
  await nextTick()
  sidebarDetailsRef.value?.focusImportTab()
}

async function focusValidationPanel(highlight: boolean) {
  validationHighlight.value = highlight
  await nextTick()
  sidebarDetailsRef.value?.focusExportTab()
  if (!highlight) return
  window.setTimeout(() => {
    validationHighlight.value = false
  }, 3000)
}

async function newSong() {
  if (loading.value) return

  if (loaded.value || canPlay.value) {
    const ok = await openConfirmDialog({
      title: 'New song',
      message: 'Start a new blank song? Current pattern data will be discarded.',
      confirmLabel: 'New song',
    })
    if (!ok) return
  }

  stopPlayback(true)
  history.clear()
  syncHistoryState()
  song.value = createBlankSong()
  report.value = blankReport()
  sourceMidiBuffer.value = null
  gridSessionStarted.value = false
  validation.value = null
  loaded.value = false
  selectedPattern.value = 0
  selectedOrderIndex.value = 0
  baseOctave.value = 4
  resetEditCursor()
  transport.value = createDefaultTransportOptions()
  statusMessage.value = 'New blank song'
  statusTone.value = 'info'
}

async function importMidiFile(file: File) {
  // Full conversion pipeline; opens channel picker when >8 note channels.
  if (!/\.(mid|midi)$/i.test(file.name)) {
    statusMessage.value = 'Please choose a .mid or .midi file'
    statusTone.value = 'error'
    return
  }

  stopPlayback(false)

  loading.value = true
  validation.value = null
  statusMessage.value = 'Reading MIDI file…'
  statusTone.value = 'info'

  try {
    const buffer = await file.arrayBuffer()
    sourceMidiBuffer.value = buffer.slice(0)
    gridSessionStarted.value = true

    let selectedChannels: number[] | undefined
    const candidates = listMidiChannelCandidates(buffer)
    if (candidates.length > 8) {
      loading.value = false
      const picked = await openChannelPickerDialog(candidates, file.name)
      loading.value = true
      if (!picked) {
        statusMessage.value = 'Import cancelled'
        statusTone.value = 'info'
        return
      }
      selectedChannels = picked
    }

    const conversion = importMidiBuffer(buffer, (state) => {
      statusMessage.value = state.message
    }, { sourceFilename: file.name, selectedChannels })

    song.value = conversion.song
    report.value = conversion.report
    loaded.value = true
    history.clear()
    syncHistoryState()
    selectedPattern.value = 0
    selectedOrderIndex.value = 0
    resetEditCursor()

    statusMessage.value = 'Validating export round-trip…'
    validation.value = await validateSongExport(conversion.song, conversion.report)

    const importNotes = hasImportLossNotes(conversion.report)
    await focusImportPanel()

    const loadSummary = `${conversion.report.noteCount.toLocaleString()} notes, ${conversion.report.patternCount} pattern(s)`
    statusMessage.value = importNotes
      ? `Loaded ${file.name} — ${loadSummary}`
      : `Loaded ${file.name} — ${loadSummary}`
    statusTone.value = validation.value.ok ? 'success' : 'warn'
  } catch (cause) {
    loaded.value = false
    sourceMidiBuffer.value = null
    history.clear()
    syncHistoryState()
    song.value = createBlankSong()
    report.value = blankReport()
    validation.value = null
    statusMessage.value = cause instanceof Error ? cause.message : 'Import failed'
    statusTone.value = 'error'
  } finally {
    loading.value = false
  }
}

async function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await importMidiFile(file)
}

function onDragOver(event: DragEvent) {
  if (loading.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  dragActive.value = true
}

function onDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement | null
  const related = event.relatedTarget as Node | null
  if (related && current?.contains(related)) return
  dragActive.value = false
}

async function onDrop(event: DragEvent) {
  event.preventDefault()
  dragActive.value = false
  if (loading.value) return

  const file = event.dataTransfer?.files[0]
  if (!file) return
  await importMidiFile(file)
}

function prevPattern() {
  if (isPlaying.value) stopPlayback(false)
  if (selectedOrderIndex.value > 0) {
    selectOrderSlot(selectedOrderIndex.value - 1)
  }
}

function nextPattern() {
  if (isPlaying.value) stopPlayback(false)
  if (selectedOrderIndex.value < song.value.songOrder.length - 1) {
    selectOrderSlot(selectedOrderIndex.value + 1)
  }
}

function exportZip() {
  if (!canExport.value) return
  saveProjectZipInteractive(song.value)
    .then(async (outcome) => {
      if (outcome === 'cancelled') {
        statusMessage.value = 'Save cancelled'
        statusTone.value = 'info'
        return
      }
      validation.value = await validateSongExport(song.value, loaded.value ? report.value : undefined)
      await focusValidationPanel(!validation.value.ok || validation.value.warnings.length > 0)
      statusMessage.value = validation.value.ok
        ? 'Project saved · validation OK'
        : 'Saved · validation reported issues'
      statusTone.value = validation.value.ok ? 'success' : 'warn'
    })
    .catch((error: unknown) => {
      statusMessage.value = error instanceof Error ? error.message : 'Save failed'
      statusTone.value = 'error'
    })
}

function exportPatterns() {
  if (!canExport.value) return
  saveAllPatternsInteractive(song.value)
    .then(async (result) => {
      if (result.cancelled) {
        statusMessage.value =
          result.saved > 0
            ? `Saved ${result.saved} pattern(s) · cancelled`
            : 'Save cancelled'
        statusTone.value = 'info'
        return
      }
      validation.value = await validateSongExport(song.value, loaded.value ? report.value : undefined)
      await focusValidationPanel(!validation.value.ok || validation.value.warnings.length > 0)
      const savedLabel = result.asFolder
        ? `${result.saved} pattern .mtp file(s) saved to folder`
        : `${result.saved} pattern(s) saved in ZIP`
      statusMessage.value = validation.value.ok
        ? `${savedLabel} · validation OK`
        : 'Saved · validation reported issues'
      statusTone.value = validation.value.ok ? 'success' : 'warn'
    })
    .catch((error: unknown) => {
      statusMessage.value = error instanceof Error ? error.message : 'Save failed'
      statusTone.value = 'error'
    })
}

function exportMidiReference() {
  if (!canExport.value) return
  saveGridMidiReferenceInteractive(song.value)
    .then((outcome) => {
      statusMessage.value =
        outcome === 'saved' ? 'MIDI reference saved (grid)' : 'Save cancelled'
      statusTone.value = outcome === 'saved' ? 'success' : 'info'
    })
    .catch((error: unknown) => {
      statusMessage.value = error instanceof Error ? error.message : 'MIDI save failed'
      statusTone.value = 'error'
    })
}

function exportSourceMidi() {
  const buffer = sourceMidiBuffer.value
  if (!buffer) return
  saveSourceMidiInteractive(buffer, report.value.sourceFilename)
    .then((outcome) => {
      statusMessage.value =
        outcome === 'saved' ? 'Source MIDI saved' : 'Save cancelled'
      statusTone.value = outcome === 'saved' ? 'success' : 'info'
    })
    .catch((error: unknown) => {
      statusMessage.value = error instanceof Error ? error.message : 'MIDI save failed'
      statusTone.value = 'error'
    })
}

function beginGridEditing(message: string) {
  // Dismiss blank overlay and focus T1 so Z–M works without an extra click.
  if (loading.value || isPlaying.value) return
  gridSessionStarted.value = true
  resetEditCursor()
  void nextTick(() => {
    patternEditorRef.value?.focusCursorCell()
  })
  statusMessage.value = message
  statusTone.value = 'info'
}

function focusGridFromCta() {
  beginGridEditing('Cursor on T1 — press Z–M to enter notes')
}

function loadSampleSong() {
  if (loading.value) return
  stopPlayback(true)
  gridSessionStarted.value = true
  song.value = createSampleSong()
  report.value = reportForSampleSong(song.value)
  loaded.value = false
  sourceMidiBuffer.value = null
  validation.value = null
  history.clear()
  history.checkpoint(song.value)
  syncHistoryState()
  selectedPattern.value = 0
  selectedOrderIndex.value = 0
  resetEditCursor()
  void nextTick(() => {
    patternEditorRef.value?.focusCursorCell()
  })
  statusMessage.value = 'Sample loaded — edit the grid or press Play'
  statusTone.value = 'success'
}

function toggleLoop() {
  transport.value.loop = !transport.value.loop
  statusMessage.value = transport.value.loop ? 'Loop on' : 'Loop off'
  statusTone.value = 'info'
}

function toggleFollow() {
  transport.value.followPlayhead = !transport.value.followPlayhead
  statusMessage.value = transport.value.followPlayhead ? 'Follow on' : 'Follow off'
  statusTone.value = 'info'
}

function toggleTrackMuteHandler(trackIndex: number) {
  transport.value.trackMutes = flipTrackMute(transport.value.trackMutes, trackIndex)
}

function toggleTrackSoloHandler(trackIndex: number) {
  transport.value.soloTrack = flipTrackSolo(transport.value.soloTrack, trackIndex)
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (isTypingTarget(event.target)) return

  const mod = event.metaKey || event.ctrlKey

  if (mod && event.code === 'KeyZ') {
    event.preventDefault()
    if (event.shiftKey) redoEdit()
    else undoEdit()
    return
  }

  if (mod && event.code === 'KeyY') {
    event.preventDefault()
    redoEdit()
    return
  }

  if (mod || event.altKey) return

  if (event.key === '?') {
    event.preventDefault()
    showKeyboardHelp.value = true
    return
  }

  if (event.code === 'Space') {
    event.preventDefault()
    void togglePlayback()
    return
  }

  if (isPlaying.value) return

  const pattern = currentPattern.value
  if (!pattern) return

  if (event.code === 'Period') {
    event.preventDefault()
    baseOctave.value = Math.max(0, baseOctave.value - 1)
    statusMessage.value = octaveStatusMessage()
    statusTone.value = 'info'
    return
  }

  if (event.code === 'Slash') {
    event.preventDefault()
    baseOctave.value = Math.min(8, baseOctave.value + 1)
    statusMessage.value = octaveStatusMessage()
    statusTone.value = 'info'
    return
  }

  if (event.code === 'Delete' || event.code === 'Backspace') {
    event.preventDefault()
    if (event.shiftKey) {
      clearCurrentStep()
    } else {
      clearCurrentColumn()
    }
    return
  }

  if (event.code === 'ArrowDown') {
    event.preventDefault()
    moveCursor(1, 0)
  } else if (event.code === 'ArrowUp') {
    event.preventDefault()
    moveCursor(-1, 0)
  } else if (event.code === 'ArrowLeft') {
    event.preventDefault()
    if (event.shiftKey) {
      moveCursor(0, -1)
    } else {
      moveCursor(0, 0, -1)
    }
  } else if (event.code === 'ArrowRight') {
    event.preventDefault()
    if (event.shiftKey) {
      moveCursor(0, 1)
    } else {
      moveCursor(0, 0, 1)
    }
  } else if (event.code === 'PageDown') {
    event.preventDefault()
    moveCursor(16, 0)
  } else if (event.code === 'PageUp') {
    event.preventDefault()
    moveCursor(-16, 0)
  } else if (event.code === 'Tab') {
    event.preventDefault()
    moveCursor(0, 0, event.shiftKey ? -1 : 1)
  } else if (cursorColumn.value === 'note' && isNoteKey(event.code)) {
    event.preventDefault()
    handleNoteKey(event.code)
  } else if (cursorColumn.value === 'volume') {
    const decimalMatch = /^Digit([0-9])$|^Numpad([0-9])$/.exec(event.code)
    if (decimalMatch) {
      event.preventDefault()
      handleDigit(decimalMatch[1] ?? decimalMatch[2] ?? '0')
    }
  } else {
    const hexMatch = /^Digit([0-9])$|^Numpad([0-9])$|^Key([A-F])$/i.exec(event.code)
    if (hexMatch) {
      event.preventDefault()
      handleDigit((hexMatch[1] ?? hexMatch[2] ?? hexMatch[3] ?? '0').toUpperCase())
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  stopPlayback(false)
  gmSoundfont.dispose()
})
</script>

<template>
  <div
    class="tracker-shell"
    :class="{ 'tracker-shell--drag': dragActive && !loading }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <TransportBar
      :version="appVersion"
      :title="song.title"
      :source-filename="report.sourceFilename"
      :bpm="song.bpm"
      :pattern-name="currentPattern.name"
      :order-index="selectedOrderIndex"
      :order-length="song.songOrder.length"
      :pos-label="posLabel"
      :octave="baseOctave"
      :octave-range="octaveRangeLabel"
      :loading="loading"
      :has-song="loaded"
      :is-playing="isPlaying"
      :can-play="canPlay"
      :loop="transport.loop"
      :follow-playhead="transport.followPlayhead"
      :preview-limited="previewLimited"
      @prev-pattern="prevPattern"
      @next-pattern="nextPattern"
      @toggle-play="togglePlayback"
      @stop-play="stopPlayback()"
      @rewind-play="rewindToStart()"
      @toggle-loop="toggleLoop"
      @toggle-follow="toggleFollow"
      @update:title="setSongTitle"
    />

    <MenuBar
      :loading="loading"
      :can-export="canExport"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :has-source-midi="hasSourceMidi"
      @load="openFilePicker"
      @load-sample="loadSampleSong"
      @new="newSong"
      @undo="undoEdit"
      @redo="redoEdit"
      @export-project="exportZip"
      @export-patterns="exportPatterns"
      @export-midi-reference="exportMidiReference"
      @export-source-midi="exportSourceMidi"
      @help="showKeyboardHelp = true"
      @about="showAbout = true"
    />

    <div class="tracker-workspace" :class="{ 'tracker-workspace--loading': loading }">
      <div v-if="loading" class="tracker-loading" aria-live="polite" aria-busy="true">
        <span class="tracker-loading__spinner" aria-hidden="true" />
        <span class="tracker-loading__message">{{ statusMessage }}</span>
      </div>

      <main class="tracker-main">
        <PatternEditor
          ref="patternEditor"
          :pattern="currentPattern"
          :cursor-row="cursorRow"
          :cursor-track="cursorTrack"
          :cursor-column="cursorColumn"
          :playhead-row="playheadRow"
          :triggered-tracks="triggeredTracks"
          :track-labels="trackLabels"
          :edit-buffer="editBuffer"
          :bpm="song.bpm"
          :is-playing="isPlaying"
          :follow-playhead="transport.followPlayhead"
          :tempo-rows="patternTempoRows"
          :preview-limited="previewLimited"
          :show-blank-cta="showBlankCta"
          @select-cell="selectCell"
          @update:bpm="setSongBpm"
          @update:pattern-length="setPatternLength"
          @load-midi="openFilePicker"
          @load-sample="loadSampleSong"
          @focus-grid="focusGridFromCta"
        />
      </main>

      <aside class="tracker-sidebar">
        <ChannelPanel
          :channel-map="report.channelMap"
          :track-labels="trackLabels"
          :cursor-track="cursorTrack"
          :triggered-tracks="triggeredTracks"
          :is-playing="isPlaying"
          :track-mutes="transport.trackMutes"
          :solo-track="transport.soloTrack"
          @select-track="(track) => selectCell(cursorRow, track, cursorColumn)"
          @toggle-mute="toggleTrackMuteHandler"
          @toggle-solo="toggleTrackSoloHandler"
        />

        <SidebarDetails
          ref="sidebarDetails"
          :loaded="loaded"
          :report="report"
          :song="song"
          :patterns="song.patterns"
          :song-order="song.songOrder"
          :selected-order-index="selectedOrderIndex"
          :tempo-map="song.tempoMap"
          :tempo-fx-placed="report.tempoFxPlaced"
          :validation="validation"
          :validation-highlight="validationHighlight"
          :channel-map="report.channelMap"
          @select-order="selectOrderSlot"
          @move-order-up="moveOrderUp"
          @move-order-down="moveOrderDown"
          @duplicate-order="duplicateOrderSlot"
          @remove-order="removeOrderSlot"
          @append-order="appendToSongOrder"
        />
      </aside>
    </div>

    <StatusBar :message="statusMessage" :tone="statusTone" />

    <SaveAsDialog />

    <ConfirmDialog />
    <ChannelPickerDialog />

    <KeyboardHelpPanel v-model="showKeyboardHelp" />
    <AboutDialog v-model="showAbout" />

    <input
      ref="fileInput"
      type="file"
      accept=".mid,.midi,audio/midi"
      hidden
      @change="handleFile"
    />
  </div>
</template>
