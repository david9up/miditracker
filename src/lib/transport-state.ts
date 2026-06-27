export interface TransportOptions {
  loop: boolean
  followPlayhead: boolean
  trackMutes: boolean[]
  soloTrack: number | null
}

export function createDefaultTransportOptions(): TransportOptions {
  return {
    loop: false,
    followPlayhead: true,
    trackMutes: Array.from({ length: 8 }, () => false),
    soloTrack: null,
  }
}

export function isTrackAudible(
  trackIndex: number,
  options: Pick<TransportOptions, 'trackMutes' | 'soloTrack'>,
): boolean {
  if (options.soloTrack !== null) {
    return trackIndex === options.soloTrack
  }
  return !options.trackMutes[trackIndex]
}

export function toggleTrackMute(
  mutes: boolean[],
  trackIndex: number,
): boolean[] {
  const next = [...mutes]
  next[trackIndex] = !next[trackIndex]
  return next
}

export function toggleTrackSolo(current: number | null, trackIndex: number): number | null {
  return current === trackIndex ? null : trackIndex
}
