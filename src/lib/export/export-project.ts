import Tracker, { type ProjectData } from '@polyend/tracker-lib'
import type { TrackerSong } from '@/lib/types'
import { sanitizeFilename } from '@/lib/utils'
import {
  parseProjectBuffer,
  writePatternsMetadataBuffer,
  writeProjectBuffer,
} from '@/lib/export/tracker-lib-io'

const TRACK_NAME_MAX = 21

export interface TrackerProjectLayout {
  projectMt: ArrayBuffer
  patternsMetadata: ArrayBuffer
  patternFiles: Array<{ number: number; path: string; name: string; buffer: ArrayBuffer }>
}

function truncateTrackName(name: string): string {
  return name.trim().slice(0, TRACK_NAME_MAX)
}

export function buildTrackerPlaylist(songOrder: number[]): number[] {
  const playlist = new Array(255).fill(0)
  songOrder.forEach((patternIndex, slot) => {
    playlist[slot] = patternIndex + 1
  })
  if (songOrder.length < 255) {
    playlist[songOrder.length] = 255
  }
  return playlist
}

export function patternFilePath(patternNumber: number): string {
  return `patterns/pattern_${String(patternNumber).padStart(2, '0')}.mtp`
}

export function buildProjectFromSong(song: TrackerSong): ProjectData {
  const project = Tracker.createProject(sanitizeFilename(song.title, 'midi_project'))

  project.values.globalTempo = song.bpm
  project.song.playlist = buildTrackerPlaylist(song.songOrder)
  project.song.playlistPos = 0

  song.instruments.slice(0, 8).forEach((instrument, index) => {
    if (project.values.trackNames[index]) {
      project.values.trackNames[index] = truncateTrackName(instrument.name)
    }
  })

  return project
}

export function buildPatternsMetadata(song: TrackerSong) {
  const patternNames = song.patterns.map((pattern) => pattern.name.trim().slice(0, 31))
  return Tracker.createPatternsMetadata(patternNames)
}

export function serializeProject(project: ProjectData): ArrayBuffer {
  return writeProjectBuffer(project)
}

export function serializePatternsMetadata(song: TrackerSong): ArrayBuffer {
  return writePatternsMetadataBuffer(buildPatternsMetadata(song))
}

export function buildTrackerProjectLayout(
  song: TrackerSong,
  serializePattern: (pattern: TrackerSong['patterns'][number]) => ArrayBuffer,
): TrackerProjectLayout {
  const patternFiles = song.patterns.map((pattern, index) => {
    const number = index + 1
    return {
      number,
      path: patternFilePath(number),
      name: pattern.name,
      buffer: serializePattern(pattern),
    }
  })

  return {
    projectMt: serializeProject(buildProjectFromSong(song)),
    patternsMetadata: serializePatternsMetadata(song),
    patternFiles,
  }
}

export function readProjectBuffer(buffer: ArrayBuffer): ProjectData {
  return parseProjectBuffer(buffer)
}
