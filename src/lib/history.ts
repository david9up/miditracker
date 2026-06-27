import { cloneSong } from '@/lib/clone-song'
import type { TrackerSong } from '@/lib/types'

const MAX_HISTORY = 100

export class SongHistory {
  private past: TrackerSong[] = []
  private future: TrackerSong[] = []

  clear(): void {
    this.past = []
    this.future = []
  }

  checkpoint(song: TrackerSong): void {
    this.past.push(cloneSong(song))
    if (this.past.length > MAX_HISTORY) {
      this.past.shift()
    }
    this.future = []
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  canRedo(): boolean {
    return this.future.length > 0
  }

  undo(current: TrackerSong): TrackerSong | null {
    const previous = this.past.pop()
    if (!previous) return null
    this.future.push(cloneSong(current))
    return previous
  }

  redo(current: TrackerSong): TrackerSong | null {
    const next = this.future.pop()
    if (!next) return null
    this.past.push(cloneSong(current))
    return next
  }
}
