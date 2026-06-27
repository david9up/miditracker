/**
 * Helpers for surfacing import conversion loss in the Session → Import UI.
 *
 * Loss is expected on dense MIDI (row collisions, >8 channels, unmapped CC).
 * Export remains authoritative; these flags are informational only.
 */
import type { MidiImportReport } from '@/lib/types'

export function hasImportLossNotes(report: MidiImportReport): boolean {
  return (
    report.droppedChannels > 0 || report.skippedNotes > 0 || report.skippedFxEvents > 0
  )
}

/** One-line summary for the status bar and import pane. */
export function importLossSummary(report: MidiImportReport): string {
  const parts: string[] = []
  if (report.droppedChannels > 0) {
    parts.push(`${report.droppedChannels} ch dropped`)
  }
  if (report.skippedNotes > 0) {
    parts.push(`${report.skippedNotes.toLocaleString()} notes skipped`)
  }
  if (report.skippedFxEvents > 0) {
    parts.push(`${report.skippedFxEvents} FX unmapped`)
  }
  return parts.join(' · ')
}
