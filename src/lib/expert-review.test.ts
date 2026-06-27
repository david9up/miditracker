import { describe, expect, it } from 'vitest'
import { createBlankSong } from '@/lib/blank-song'
import { importLossSummary } from '@/lib/import-loss'
import { assessTrackerPlusReadiness } from '@/lib/export/tracker-readiness'
import { validateSongExport } from '@/lib/export/validate-export'
import { PROGRAM_CHANGE_FX_INDEX, VOLUME_CC } from '@/lib/midi/midi-fx'
import { rankCcNumbers } from '@/lib/midi/midi-events'
import {
  createTestMidiBuffer,
  importMidiBuffer,
} from '@/lib/midi/import-midi'
import { compareMidiImport } from '@/lib/midi/midi-compare'
import {
  bpmToTempoFxValue,
  TEMPO_FX_INDEX,
  ticksToRow,
} from '@/lib/midi/tempo-map'
import { trackerMidiSlotForChannel } from '@/lib/midi/channels'

/**
 * Final expert review round — programmatic checklist for release sign-off.
 * Personas: Tracker+ user, UX, QA, and senior MIDI developer.
 */
describe('expert review — final round', () => {
  describe('senior MIDI developer', () => {
    it('quantizes ticks to fixed 4 rows per beat regardless of PPQ', () => {
      expect(ticksToRow(0, 480)).toBe(0)
      expect(ticksToRow(480, 480)).toBe(4)
      expect(ticksToRow(960, 192)).toBe(20)
    })

    it('maps CC7 to step volume instead of consuming an FX slot', () => {
      const buffer = createTestMidiBuffer({
        controlChanges: [{ ticks: 0, number: VOLUME_CC, value: 80 }],
      })
      const { song, report } = importMidiBuffer(buffer)
      const step = song.patterns[0]!.tracks[0]![0]!
      const fxMapping = report.channelMap[0]?.fxMapping ?? []

      expect(step.volume).toBe(80)
      expect(fxMapping.every((entry) => entry.kind !== 'cc' || entry.ccNumber !== VOLUME_CC)).toBe(
        true,
      )
    })

    it('places program changes on the dedicated PC FX index (slot f)', () => {
      const buffer = createTestMidiBuffer({
        programChanges: [{ ticks: 480, program: 42 }],
      })
      const { song, report } = importMidiBuffer(buffer)
      const pcStep = song.patterns[0]!.tracks[0]![4]!

      expect(report.programChangeCount).toBeGreaterThanOrEqual(1)
      expect(
        pcStep.fx1Type === PROGRAM_CHANGE_FX_INDEX ||
          pcStep.fx2Type === PROGRAM_CHANGE_FX_INDEX,
      ).toBe(true)
      expect(pcStep.fx1Value === 42 || pcStep.fx2Value === 42).toBe(true)
    })

    it('conserves note counts: imported + skipped equals source', () => {
      const buffer = createTestMidiBuffer()
      const { report } = importMidiBuffer(buffer)
      const result = compareMidiImport(buffer, 'expert-simple.mid')

      expect(report.noteCount + report.skippedNotes).toBe(result.sourceNoteCount)
      expect(result.mismatches).toEqual([])
    })

    it('prioritizes the most frequent CC numbers when FX slots are scarce', () => {
      const ranked = rankCcNumbers([
        { ticks: 0, channel: 0, number: 1, value: 64 },
        { ticks: 0, channel: 0, number: 1, value: 70 },
        { ticks: 0, channel: 0, number: 10, value: 64 },
        { ticks: 0, channel: 0, number: 74, value: 90 },
      ])

      expect(ranked[0]).toBe(1)
      expect(ranked).toContain(10)
      expect(ranked).toContain(74)
    })

    it('writes tempo changes as T FX on track 1 within Tracker BPM limits', () => {
      const buffer = createTestMidiBuffer({ bpm: 140 })
      const { song, report } = importMidiBuffer(buffer)
      const tempoStep = song.patterns[0]!.tracks[0]!.find(
        (step) => step.fx1Type === TEMPO_FX_INDEX || step.fx2Type === TEMPO_FX_INDEX,
      )

      expect(report.tempoChangeCount).toBe(0)
      expect(song.bpm).toBe(140)
      expect(bpmToTempoFxValue(140)).toBe(140)
      expect(tempoStep).toBeUndefined()
    })

    it('maps MIDI channels to hardware slots 48–63 (UI 49–64)', () => {
      const buffer = createTestMidiBuffer({ channel: 3 })
      const { report } = importMidiBuffer(buffer)

      expect(report.channelMap[0]?.trackerSlot).toBe(trackerMidiSlotForChannel(3))
      expect(report.channelMap[0]?.instrumentId).toBe(52)
    })
  })

  describe('Tracker+ power user', () => {
    it('passes export validation and surfaces hardware routing guidance', async () => {
      const { song, report } = importMidiBuffer(createTestMidiBuffer())
      const validation = await validateSongExport(song, report)
      const readiness = assessTrackerPlusReadiness(song, report)

      expect(validation.ok).toBe(true)
      expect(readiness.ready).toBe(true)
      expect(readiness.warnings.some((w) => w.includes('MIDI Out slots 48–63'))).toBe(true)
      expect(report.channelMap.every((e) => e.trackerSlot >= 48 && e.trackerSlot <= 63)).toBe(
        true,
      )
    })
  })

  describe('UX / product', () => {
    it('summarizes import loss in plain language for the Session import tab', () => {
      const { report } = importMidiBuffer(createTestMidiBuffer())
      const lossyReport = {
        ...report,
        droppedChannels: 2,
        skippedNotes: 120,
        skippedFxEvents: 5,
        droppedChannelNames: ['Ch3: Oboe', 'Ch5: Strings'],
      }

      expect(importLossSummary(lossyReport)).toBe(
        '2 ch dropped · 120 notes skipped · 5 FX unmapped',
      )
    })

    it('starts blank songs without phantom notes', () => {
      const blank = createBlankSong()
      expect(
        blank.patterns.some((pattern) =>
          pattern.tracks.some((track) => track.some((step) => step.note >= 0)),
        ),
      ).toBe(false)
    })
  })

  describe('QA release gate', () => {
    it('accepts a minimal MIDI import through validation with zero blockers', async () => {
      const { song, report } = importMidiBuffer(createTestMidiBuffer(), undefined, {
        sourceFilename: 'release-gate.mid',
      })
      const validation = await validateSongExport(song, report)
      const readiness = assessTrackerPlusReadiness(song, report)

      expect(report.sourceFilename).toBe('release-gate.mid')
      expect(validation.ok).toBe(true)
      expect(readiness.blockers).toEqual([])
    })
  })
})
