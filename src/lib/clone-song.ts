import type { TrackerSong } from '@/lib/types'

/** Plain deep copy safe for undo history (avoids Vue proxy clone errors). */
export function cloneSong(song: TrackerSong): TrackerSong {
  return {
    title: song.title,
    bpm: song.bpm,
    ppq: song.ppq,
    patterns: song.patterns.map((pattern) => ({
      name: pattern.name,
      length: pattern.length,
      tracks: pattern.tracks.map((track) => track.map((step) => ({ ...step }))),
    })),
    instruments: song.instruments.map((instrument) => ({
      ...instrument,
      fxMapping: [...instrument.fxMapping],
    })),
    songOrder: [...song.songOrder],
    tempoMap: song.tempoMap.map((entry) => ({ ...entry })),
  }
}
