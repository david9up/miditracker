import { describe, expect, it } from 'vitest'
import {
  adjustOrderIndexAfterMove,
  appendSongOrderSlot,
  moveSongOrderSlot,
  removeSongOrderSlot,
} from '@/lib/song-order'

describe('song-order', () => {
  it('moves a playlist slot', () => {
    expect(moveSongOrderSlot([0, 1, 2], 0, 2)).toEqual([1, 2, 0])
  })

  it('keeps at least one playlist slot', () => {
    expect(removeSongOrderSlot([0], 0)).toEqual([0])
    expect(removeSongOrderSlot([0, 1], 1)).toEqual([0])
  })

  it('appends a pattern to the playlist', () => {
    expect(appendSongOrderSlot([0, 1], 0)).toEqual([0, 1, 0])
  })

  it('adjusts selected index when reordering', () => {
    expect(adjustOrderIndexAfterMove(2, 0, 2)).toBe(1)
    expect(adjustOrderIndexAfterMove(1, 0, 2)).toBe(0)
  })
})
