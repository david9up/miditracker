import { describe, expect, it } from 'vitest'
import {
  createDefaultTransportOptions,
  isTrackAudible,
  toggleTrackMute,
  toggleTrackSolo,
} from '@/lib/transport-state'

describe('transport-state', () => {
  it('defaults to follow on and loop off', () => {
    const options = createDefaultTransportOptions()
    expect(options.followPlayhead).toBe(true)
    expect(options.loop).toBe(false)
  })

  it('mutes and unmutes tracks', () => {
    const mutes = toggleTrackMute(createDefaultTransportOptions().trackMutes, 2)
    expect(mutes[2]).toBe(true)
    expect(isTrackAudible(2, { trackMutes: mutes, soloTrack: null })).toBe(false)
  })

  it('solo overrides mute state', () => {
    const mutes = [true, false, false, false, false, false, false, false]
    expect(isTrackAudible(0, { trackMutes: mutes, soloTrack: 0 })).toBe(true)
    expect(isTrackAudible(1, { trackMutes: mutes, soloTrack: 0 })).toBe(false)
  })

  it('toggles solo on same track off', () => {
    expect(toggleTrackSolo(3, 3)).toBeNull()
    expect(toggleTrackSolo(null, 4)).toBe(4)
  })
})
