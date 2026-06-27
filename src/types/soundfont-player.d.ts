declare module 'soundfont-player' {
  export interface SoundfontInstrument {
    name: string
    play(
      note: number | string,
      when?: number,
      duration?: number,
      options?: { gain?: number; attack?: number; release?: number },
    ): unknown
  }

  export function instrument(
    ac: AudioContext,
    name: string,
    options?: {
      soundfont?: 'FluidR3_GM' | 'MusyngKite'
      format?: 'mp3' | 'ogg'
      gain?: number
      destination?: AudioNode
    },
  ): Promise<SoundfontInstrument>

  const Soundfont: {
    instrument: typeof instrument
  }

  export default Soundfont
}
