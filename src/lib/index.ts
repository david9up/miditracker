export type {
  MidiChannelMapEntry,
  MidiConversionResult,
  MidiImportProgress,
  MidiImportProgressCallback,
  MidiImportReport,
  MidiInstrument,
  Pattern,
  Step,
  TrackerSong,
} from '@/lib/types'

export {
  DEFAULT_PATTERN_LENGTH,
  EMPTY_NOTE,
  MAX_PATTERN_LENGTH,
  MIN_PATTERN_LENGTH,
  ROWS_PER_BEAT,
  TRACK_COUNT,
} from '@/lib/types'

export {
  FIRST_MIDI_INSTRUMENT_ID,
  LAST_MIDI_INSTRUMENT_ID,
  MAX_MIDI_CHANNELS,
  gmProgramName,
  instrumentIdForMidiChannel,
  isMidiInstrumentId,
  midiChannelLabel,
  trackerMidiSlotForChannel,
  trackerMidiSlotForInstrumentId,
} from '@/lib/midi/channels'

export { clampNote, canPromptSaveFile, canUseDirectoryPicker, canUseNativeFileSystem, downloadBlob, nativeSaveHint, noteToString, promptSaveFile, sanitizeFilename, saveBlobAs, writeBlobToFileHandle } from '@/lib/utils'
export type { SaveBlobOptions } from '@/lib/utils'

export {
  buildTempoMap,
  bpmToTempoFxValue,
  normalizeTempos,
  tempoChangesForFx,
  ticksToRow,
  TEMPO_FX_INDEX,
  TEMPO_FX_MAX,
  TEMPO_FX_MIN,
} from '@/lib/midi/tempo-map'
export type { MidiTempoEvent, TempoMapEntry } from '@/lib/midi/tempo-map'

export {
  computePatternBoundaries,
  flattenPatterns,
  repartitionPatterns,
} from '@/lib/midi/pattern-split'

export { blankReport, createBlankSong, createEmptyPattern, createEmptyStep } from '@/lib/blank-song'

export {
  buildFxMappings,
  ccLabel,
  fxRecordForIndex,
  fxSymbolForIndex,
  mappingForCc,
  mappingForProgramChange,
  MIDI_FX_SLOTS,
  VOLUME_CC,
} from '@/lib/midi/midi-fx'
export type { MidiFxMapping, MidiFxSlot } from '@/lib/midi/midi-fx'

export {
  collectChannelMidiEvents,
  rankCcNumbers,
} from '@/lib/midi/midi-events'
export type {
  ChannelMidiEvents,
  MidiControlEvent,
  MidiProgramChangeEvent,
} from '@/lib/midi/midi-events'

export { createTestMidiBuffer, findNotePlacementRow, importMidiBuffer, listMidiChannelCandidates } from '@/lib/midi/import-midi'
export type { MidiChannelCandidate } from '@/lib/types'

export {
  buildPatternsMetadata,
  buildProjectFromSong,
  buildTrackerPlaylist,
  buildTrackerProjectLayout,
  patternFilePath,
  readProjectBuffer,
  serializePatternsMetadata,
  serializeProject,
} from '@/lib/export/export-project'
export type { TrackerProjectLayout } from '@/lib/export/export-project'

export {
  exportAllPatterns,
  exportPatternFile,
  exportProjectZip,
  patternToTrackerData,
  serializePattern,
} from '@/lib/export/export-tracker'

export {
  saveAllPatternsInteractive,
  saveProjectZipInteractive,
} from '@/lib/export/save-file'
export type { SaveOutcome, SavePatternsResult } from '@/lib/export/save-file'

export {
  saveGridMidiReferenceInteractive,
  saveSourceMidiInteractive,
  songToMidiBuffer,
} from '@/lib/export/export-midi'

export {
  assessTrackerPlusReadiness,
} from '@/lib/export/tracker-readiness'
export type { TrackerPlusReadiness } from '@/lib/export/tracker-readiness'

export {
  parsePatternBuffer,
  parsePatternsMetadataBuffer,
  parseProjectBuffer,
  writePatternBuffer,
  writePatternsMetadataBuffer,
  writeProjectBuffer,
} from '@/lib/export/tracker-lib-io'

export {
  diagnoseMidiBuffer,
  formatMidiImportError,
} from '@/lib/midi/midi-diagnose'
export type { MidiDiagnostic, MidiDiagnosticReason } from '@/lib/midi/midi-diagnose'

export {
  createDefaultTransportOptions,
  isTrackAudible,
  toggleTrackMute,
  toggleTrackSolo,
} from '@/lib/transport-state'
export type { TransportOptions } from '@/lib/transport-state'

export {
  formatValidateExportReport,
  validateBlankProjectZipExport,
  validateExportPath,
} from '@/lib/export/validate-export-file'
export type {
  ExportFileCheck,
  ExportFileKind,
  ValidateExportFileResult,
} from '@/lib/export/validate-export-file'

export {
  validateSongExport,
  verifyPatternExport,
  verifyTrackerProjectExport,
} from '@/lib/export/validate-export'
export type { ExportValidationCheck, ExportValidationResult } from '@/lib/export/validate-export'
