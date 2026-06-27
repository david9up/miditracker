import Soundfont from 'soundfont-player'
import {
  gmProgramName,
  instrumentIdForMidiChannel,
} from '@/lib/midi/channels'
import type { SoundfontInstrument } from 'soundfont-player'
import type { Step, TrackerSong } from '@/lib/types'

/** FluidR3_GM instrument names indexed by General MIDI program (0–127). */
export const GM_SOUNDFONT_NAMES: readonly string[] = [
  'acoustic_grand_piano',
  'bright_acoustic_piano',
  'electric_grand_piano',
  'honkytonk_piano',
  'electric_piano_1',
  'electric_piano_2',
  'harpsichord',
  'clavinet',
  'celesta',
  'glockenspiel',
  'music_box',
  'vibraphone',
  'marimba',
  'xylophone',
  'tubular_bells',
  'dulcimer',
  'drawbar_organ',
  'percussive_organ',
  'rock_organ',
  'church_organ',
  'reed_organ',
  'accordion',
  'harmonica',
  'tango_accordion',
  'acoustic_guitar_nylon',
  'acoustic_guitar_steel',
  'electric_guitar_jazz',
  'electric_guitar_clean',
  'electric_guitar_muted',
  'overdriven_guitar',
  'distortion_guitar',
  'guitar_harmonics',
  'acoustic_bass',
  'electric_bass_finger',
  'electric_bass_pick',
  'fretless_bass',
  'slap_bass_1',
  'slap_bass_2',
  'synth_bass_1',
  'synth_bass_2',
  'violin',
  'viola',
  'cello',
  'contrabass',
  'tremolo_strings',
  'pizzicato_strings',
  'orchestral_harp',
  'timpani',
  'string_ensemble_1',
  'string_ensemble_2',
  'synth_strings_1',
  'synth_strings_2',
  'choir_aahs',
  'voice_oohs',
  'synth_choir',
  'orchestra_hit',
  'trumpet',
  'trombone',
  'tuba',
  'muted_trumpet',
  'french_horn',
  'brass_section',
  'synth_brass_1',
  'synth_brass_2',
  'soprano_sax',
  'alto_sax',
  'tenor_sax',
  'baritone_sax',
  'oboe',
  'english_horn',
  'bassoon',
  'clarinet',
  'piccolo',
  'flute',
  'recorder',
  'pan_flute',
  'blown_bottle',
  'shakuhachi',
  'whistle',
  'ocarina',
  'lead_1_square',
  'lead_2_sawtooth',
  'lead_3_calliope',
  'lead_4_chiff',
  'lead_5_charang',
  'lead_6_voice',
  'lead_7_fifths',
  'lead_8_bass__lead',
  'pad_1_new_age',
  'pad_2_warm',
  'pad_3_polysynth',
  'pad_4_choir',
  'pad_5_bowed',
  'pad_6_metallic',
  'pad_7_halo',
  'pad_8_sweep',
  'fx_1_rain',
  'fx_2_soundtrack',
  'fx_3_crystal',
  'fx_4_atmosphere',
  'fx_5_brightness',
  'fx_6_goblins',
  'fx_7_echoes',
  'fx_8_scifi',
  'sitar',
  'banjo',
  'shamisen',
  'koto',
  'kalimba',
  'bagpipe',
  'fiddle',
  'shanai',
  'tinkle_bell',
  'agogo',
  'steel_drums',
  'woodblock',
  'taiko_drum',
  'melodic_tom',
  'synth_drum',
  'reverse_cymbal',
  'guitar_fret_noise',
  'breath_noise',
  'seashore',
  'bird_tweet',
  'telephone_ring',
  'helicopter',
  'applause',
  'gunshot',
] as const

const DEFAULT_TRACK_PROGRAMS = [0, 24, 32, 40, 48, 56, 64, 72] as const
const DRUMS_SOUNDFONT = 'synth_drum'

export function soundfontNameForProgram(program: number): string {
  if (program >= 128) return DRUMS_SOUNDFONT
  return GM_SOUNDFONT_NAMES[program] ?? GM_SOUNDFONT_NAMES[0]!
}

export function resolveInstrumentId(
  song: TrackerSong,
  trackIndex: number,
  step: Step,
): number {
  if (step.instrument > 0) return step.instrument
  const mapped = song.instruments.find((item) => item.trackerSlot === trackIndex + 48)
  if (mapped) return mapped.id
  return instrumentIdForMidiChannel(trackIndex)
}

export function resolveGmProgram(
  song: TrackerSong,
  trackIndex: number,
  step: Step,
): number {
  const instrumentId = resolveInstrumentId(song, trackIndex, step)
  const instrument = song.instruments.find((item) => item.id === instrumentId)
  if (instrument) return instrument.program
  return DEFAULT_TRACK_PROGRAMS[trackIndex] ?? 0
}

export function instrumentLabelForTrack(
  song: TrackerSong,
  trackIndex: number,
  channelName?: string,
): string {
  if (channelName?.trim()) return channelName.trim()

  const instrumentId = instrumentIdForMidiChannel(trackIndex)
  const instrument = song.instruments.find((item) => item.id === instrumentId)
  if (instrument?.name) return instrument.name

  const program = DEFAULT_TRACK_PROGRAMS[trackIndex] ?? 0
  return gmProgramName(program)
}

/** Strip redundant MIDI channel prefix for grid headers (track number is shown separately). */
export function compactInstrumentLabel(label: string): string {
  const trimmed = label.trim()
  const withoutChannel = trimmed.replace(/^Ch\s*\d+\s*:\s*/i, '').trim()
  return withoutChannel || trimmed
}

function stepGain(step: Step): number {
  if (step.volume > 0) return Math.min(1, step.volume / 100)
  return 0.78
}

export class GmSoundfontEngine {
  private context: AudioContext | null = null
  private cache = new Map<string, SoundfontInstrument>()
  private loading = new Map<string, Promise<SoundfontInstrument>>()

  get ready(): boolean {
    return this.context !== null
  }

  get audioContext(): AudioContext | null {
    return this.context
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext()
    }
    await this.context.resume()
    return this.context
  }

  async loadProgram(program: number): Promise<SoundfontInstrument> {
    const context = await this.ensureContext()
    const name = soundfontNameForProgram(program)
    const cached = this.cache.get(name)
    if (cached) return cached

    const pending = this.loading.get(name)
    if (pending) return pending

    const promise = Soundfont.instrument(context, name, {
      soundfont: 'FluidR3_GM',
      format: 'mp3',
      gain: 1,
    }).then((instrument) => {
      this.cache.set(name, instrument)
      this.loading.delete(name)
      return instrument
    })

    this.loading.set(name, promise)
    return promise
  }

  async playStep(
    song: TrackerSong,
    trackIndex: number,
    step: Step,
    when: number,
    durationSec: number,
    programOverride?: number,
  ): Promise<void> {
    if (step.note < 0) return

    const program = programOverride ?? resolveGmProgram(song, trackIndex, step)
    const instrument = await this.loadProgram(program)
    const context = await this.ensureContext()
    const start = when > 0 ? when : context.currentTime
    instrument.play(step.note, start, Math.max(0.05, durationSec), {
      gain: stepGain(step),
      release: Math.min(0.35, durationSec * 0.85),
    })
  }

  async previewStep(
    song: TrackerSong,
    trackIndex: number,
    step: Step,
    durationSec = 0.22,
  ): Promise<void> {
    const context = await this.ensureContext()
    await this.playStep(song, trackIndex, step, context.currentTime, durationSec)
  }

  async previewNote(
    song: TrackerSong,
    trackIndex: number,
    note: number,
    volume = 72,
    instrumentId = 0,
  ): Promise<void> {
    if (note < 0) return
    await this.previewStep(
      song,
      trackIndex,
      {
        note,
        instrument: instrumentId,
        volume,
        fx1Type: 0,
        fx1Value: 0,
        fx2Type: 0,
        fx2Value: 0,
      },
      0.22,
    )
  }

  dispose(): void {
    this.cache.clear()
    this.loading.clear()
    if (this.context) {
      void this.context.close()
      this.context = null
    }
  }
}

export const gmSoundfont = new GmSoundfontEngine()
