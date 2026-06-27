import { describe, expect, it } from 'vitest'
import { createSampleSong, reportForSampleSong } from '@/lib/sample-song'

describe('createSampleSong', () => {
  it('includes a playable melody and bass line', () => {
    const song = createSampleSong()
    const report = reportForSampleSong(song)

    expect(song.title).toBe('Sample · C major')
    expect(report.noteCount).toBe(11)
    expect(report.channelsUsed).toBe(2)
    expect(song.patterns[0]?.tracks[0]?.[0]?.note).toBe(60)
    expect(song.patterns[0]?.tracks[1]?.[0]?.note).toBe(48)
  })
})
