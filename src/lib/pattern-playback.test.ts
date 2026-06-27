import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gm-soundfont', () => ({
  gmSoundfont: {
    ensureContext: vi.fn(async () => ({ currentTime: 0, resume: vi.fn() })),
    playStep: vi.fn(async () => undefined),
    previewNote: vi.fn(async () => undefined),
    dispose: vi.fn(),
  },
}))

import { PatternPlayback } from '@/lib/pattern-playback'
import { createBlankSong } from '@/lib/blank-song'
import { setNoteOnStep } from '@/lib/pattern-edit'
import { ROWS_PER_BEAT } from '@/lib/types'

function rowDurationMs(bpm: number): number {
  return (60_000 / bpm) / ROWS_PER_BEAT
}

describe('pattern playback timing', () => {
  it('uses 4 rows per beat', () => {
    expect(rowDurationMs(120)).toBe(125)
    expect(rowDurationMs(125)).toBe(120)
  })
})

describe('pattern playback loop', () => {
  it('loops song order when enabled', async () => {
    vi.useFakeTimers()
    const playback = new PatternPlayback()
    const song = createBlankSong()
    song.patterns[0]!.length = 4
    setNoteOnStep(song.patterns[0]!.tracks[0]![0]!, 60)

    const orderChanges: number[] = []
    let finishCount = 0

    const startPromise = playback.start({
      song,
      startOrderIndex: 0,
      startRow: 0,
      transport: { loop: true, trackMutes: Array(8).fill(false), soloTrack: null },
      onRow: () => {},
      onOrderChange: (orderIndex) => {
        orderChanges.push(orderIndex)
      },
      onFinish: () => {
        finishCount += 1
      },
    })

    await startPromise
    await vi.advanceTimersByTimeAsync(4 * rowDurationMs(song.bpm) + 5)
    await vi.advanceTimersByTimeAsync(4 * rowDurationMs(song.bpm) + 5)

    expect(finishCount).toBe(0)
    expect(orderChanges.filter((index) => index === 0).length).toBeGreaterThan(1)

    playback.stop()
    vi.useRealTimers()
  })
})
