import { gmSoundfont, resolveGmProgram } from '@/lib/gm-soundfont'
import {
  bpmFromTempoMapAtRow,
  globalRowForPosition,
  initialTrackPrograms,
  programChangeFromStep,
  rowDurationMs,
  tempoFxBpmFromStep,
} from '@/lib/playback-tempo'
import { isTrackAudible, type TransportOptions } from '@/lib/transport-state'
import type { Pattern, Step, TrackerSong } from '@/lib/types'

export interface PatternPlaybackOptions {
  song: TrackerSong
  startOrderIndex: number
  startRow: number
  transport?: Pick<TransportOptions, 'loop' | 'trackMutes' | 'soloTrack'>
  onRow: (orderIndex: number, patternIndex: number, row: number, triggeredTracks: boolean[]) => void
  onOrderChange: (orderIndex: number, patternIndex: number) => void
  onFinish: () => void
}

function stepGain(step: Step): number {
  if (step.volume > 0) {
    return Math.min(1, step.volume / 100)
  }
  return 0.72
}

function triggeredTracksForRow(
  pattern: Pattern,
  row: number,
  transport?: Pick<TransportOptions, 'trackMutes' | 'soloTrack'>,
): boolean[] {
  return pattern.tracks.map((track, trackIndex) => {
    const step = track[row]
    if (!step || step.note < 0) return false
    if (transport && !isTrackAudible(trackIndex, transport)) return false
    return true
  })
}

export class PatternPlayback {
  private timerId: ReturnType<typeof setTimeout> | null = null
  private running = false
  private options: PatternPlaybackOptions | null = null
  private orderIndex = 0
  private patternIndex = 0
  private row = 0
  private audioTime = 0
  private currentBpm = 120
  private trackPrograms: number[] = Array.from({ length: 8 }, () => 0)

  get isRunning(): boolean {
    return this.running
  }

  async start(options: PatternPlaybackOptions): Promise<void> {
    this.stop(false)
    this.options = options
    this.orderIndex = options.startOrderIndex
    this.patternIndex = options.song.songOrder[options.startOrderIndex] ?? 0
    this.row = options.startRow
    this.running = true
    this.trackPrograms = initialTrackPrograms(options.song)
    const startGlobalRow = globalRowForPosition(
      options.song,
      options.startOrderIndex,
      options.startRow,
    )
    this.currentBpm = bpmFromTempoMapAtRow(options.song, startGlobalRow)

    await gmSoundfont.ensureContext()
    this.audioTime = gmSoundfont.audioContext?.currentTime ?? 0

    options.onOrderChange(this.orderIndex, this.patternIndex)
    this.scheduleNextRow()
  }

  pause(): void {
    this.stop(false)
  }

  stop(notify = true): void {
    this.running = false
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    if (notify) {
      this.options?.onFinish()
    }
    this.options = null
  }

  private applyRowTempoAndPrograms(song: TrackerSong, pattern: Pattern, row: number): void {
    const globalRow = globalRowForPosition(song, this.orderIndex, row)
    this.currentBpm = bpmFromTempoMapAtRow(song, globalRow)

    const tempoStep = pattern.tracks[0]?.[row]
    if (tempoStep) {
      const tempoFxBpm = tempoFxBpmFromStep(tempoStep)
      if (tempoFxBpm !== null) {
        this.currentBpm = tempoFxBpm
      }
    }

    pattern.tracks.forEach((track, trackIndex) => {
      const step = track[row]
      if (!step) return
      const programChange = programChangeFromStep(step)
      if (programChange !== null) {
        this.trackPrograms[trackIndex] = programChange
      }
    })
  }

  private scheduleNextRow(): void {
    if (!this.running || !this.options) return

    const { song, onRow, onFinish, transport } = this.options
    const pattern = song.patterns[this.patternIndex]
    if (!pattern) {
      this.stop()
      return
    }

    this.applyRowTempoAndPrograms(song, pattern, this.row)

    const triggered = triggeredTracksForRow(pattern, this.row, transport)
    onRow(this.orderIndex, this.patternIndex, this.row, triggered)
    void this.playRow(song, pattern, this.row, this.audioTime, transport)

    const duration = rowDurationMs(this.currentBpm)
    this.audioTime += duration / 1000

    this.timerId = setTimeout(() => {
      if (!this.running || !this.options) return

      this.row += 1
      if (this.row >= pattern.length) {
        const nextOrderIndex = this.orderIndex + 1
        const nextPatternIndex = song.songOrder[nextOrderIndex]

        if (nextPatternIndex === undefined) {
          if (transport?.loop) {
            this.orderIndex = 0
            this.patternIndex = song.songOrder[0] ?? 0
            this.row = 0
            this.options.onOrderChange(this.orderIndex, this.patternIndex)
            this.scheduleNextRow()
            return
          }

          this.stop()
          onFinish()
          return
        }

        this.orderIndex = nextOrderIndex
        this.patternIndex = nextPatternIndex
        this.row = 0
        this.options.onOrderChange(this.orderIndex, this.patternIndex)
      }

      this.scheduleNextRow()
    }, duration)
  }

  private async playRow(
    song: TrackerSong,
    pattern: Pattern,
    row: number,
    when: number,
    transport?: Pick<TransportOptions, 'trackMutes' | 'soloTrack'>,
  ): Promise<void> {
    const durationSec = rowDurationMs(this.currentBpm) / 1000
    const noteLength = Math.max(0.05, durationSec * 0.92)

    const plays = pattern.tracks.map((track, trackIndex) => {
      if (transport && !isTrackAudible(trackIndex, transport)) return null
      const step = track[row]
      if (!step || step.note < 0) return null
      const programOverride = this.trackPrograms[trackIndex] ?? resolveGmProgram(song, trackIndex, step)
      return gmSoundfont.playStep(song, trackIndex, step, when, noteLength, programOverride)
    })

    await Promise.all(plays.filter(Boolean))
  }
}

export const patternPlayback = new PatternPlayback()

export async function previewNote(
  song: TrackerSong,
  trackIndex: number,
  note: number,
  volume = 72,
  instrumentId = 0,
): Promise<void> {
  await gmSoundfont.previewNote(song, trackIndex, note, volume, instrumentId)
}

/** @deprecated kept for tests that only need gain curve */
export { stepGain }
