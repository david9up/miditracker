<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ccLabel } from '@/lib/midi/midi-fx'
import type { TrackInstrumentLabel } from '@/lib/track-labels'
import type { MidiChannelMapEntry } from '@/lib/types'

const props = defineProps<{
  channelMap: MidiChannelMapEntry[]
  trackLabels: TrackInstrumentLabel[]
  cursorTrack: number
  triggeredTracks?: boolean[]
  isPlaying?: boolean
  trackMutes?: boolean[]
  soloTrack?: number | null
}>()

const emit = defineEmits<{
  selectTrack: [track: number]
  toggleMute: [track: number]
  toggleSolo: [track: number]
}>()

const expandedTrack = ref<number | null>(null)

function formatFxMapping(mapping: MidiChannelMapEntry['fxMapping'][number]): string {
  if (mapping.kind === 'pc') return `${mapping.slot} · PC`
  return `${mapping.slot} · ${ccLabel(mapping.ccNumber ?? 0)}`
}

function isExpanded(trackIndex: number): boolean {
  return expandedTrack.value === trackIndex
}

function onTrackClick(trackIndex: number) {
  emit('selectTrack', trackIndex)
  expandedTrack.value = expandedTrack.value === trackIndex ? null : trackIndex
}

watch(
  () => props.cursorTrack,
  (track) => {
    expandedTrack.value = track
  },
)

function onTrackKeydown(event: KeyboardEvent, trackIndex: number) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onTrackClick(trackIndex)
  }
}

const channelThemes = [
  { color: '#55ffff', glow: 'rgba(85, 255, 255, 0.35)', bg: 'rgba(85, 255, 255, 0.08)' },
  { color: '#ffff55', glow: 'rgba(255, 255, 85, 0.35)', bg: 'rgba(255, 255, 85, 0.08)' },
  { color: '#ff55ff', glow: 'rgba(255, 85, 255, 0.35)', bg: 'rgba(255, 85, 255, 0.08)' },
  { color: '#55ff55', glow: 'rgba(85, 255, 85, 0.35)', bg: 'rgba(85, 255, 85, 0.08)' },
  { color: '#ffaa55', glow: 'rgba(255, 170, 85, 0.35)', bg: 'rgba(255, 170, 85, 0.08)' },
  { color: '#aaaaff', glow: 'rgba(170, 170, 255, 0.35)', bg: 'rgba(170, 170, 255, 0.08)' },
  { color: '#ff8888', glow: 'rgba(255, 136, 136, 0.35)', bg: 'rgba(255, 136, 136, 0.08)' },
  { color: '#88ffcc', glow: 'rgba(136, 255, 204, 0.35)', bg: 'rgba(136, 255, 204, 0.08)' },
] as const

const tracks = computed(() =>
  Array.from({ length: 8 }, (_, index) => {
    const entry = props.channelMap[index]
    const theme = channelThemes[index]!
    return {
      index,
      entry,
      theme,
      label: props.trackLabels[index]?.name ?? 'Empty track',
      shortLabel: props.trackLabels[index]?.shortName ?? '—',
      displayName: props.trackLabels[index]?.shortName !== '—'
        ? props.trackLabels[index]!.shortName
        : props.trackLabels[index]?.name ?? 'Empty track',
      instrumentId: entry?.instrumentId ?? 49 + index,
      midiSlot: entry?.trackerSlot ?? 48 + index,
      muted: props.trackMutes?.[index] ?? false,
      solo: props.soloTrack === index,
      silent:
        props.soloTrack !== null && props.soloTrack !== undefined
          ? props.soloTrack !== index
          : (props.trackMutes?.[index] ?? false),
    }
  }),
)
</script>

<template>
  <section class="channel-panel panel">
    <header class="channel-panel__header">
      <h2 class="channel-panel__title">Channels</h2>
      <span class="channel-panel__subtitle">8 tracks · MIDI 49–64</span>
    </header>

    <div class="channel-panel__list">
      <article
        v-for="track in tracks"
        :key="track.index"
        class="channel-card"
        :class="{
          'channel-card--selected': cursorTrack === track.index,
          'channel-card--expanded': isExpanded(track.index),
          'channel-card--playing': isPlaying && triggeredTracks?.[track.index],
          'channel-card--loaded': Boolean(track.entry),
          'channel-card--muted': track.silent,
          'channel-card--solo': track.solo,
        }"
        :style="{
          '--ch-color': track.theme.color,
          '--ch-glow': track.theme.glow,
          '--ch-bg': track.theme.bg,
        }"
      >
        <div class="channel-card__rail" aria-hidden="true" />

        <div class="channel-card__row">
          <button
            type="button"
            class="channel-card__select"
            :aria-label="`Track ${track.index + 1}, ${track.label}`"
            :aria-expanded="isExpanded(track.index)"
            :aria-current="cursorTrack === track.index ? 'true' : undefined"
            @click="onTrackClick(track.index)"
            @keydown="onTrackKeydown($event, track.index)"
          >
            <span class="channel-card__track-num">{{ String(track.index + 1).padStart(2, '0') }}</span>
            <span class="channel-card__name" :title="track.label">{{ track.displayName }}</span>
            <span v-if="track.entry" class="channel-card__hint">
              {{ track.entry.noteCount.toLocaleString() }}
            </span>
            <span class="channel-card__chevron" aria-hidden="true">
              {{ isExpanded(track.index) ? '▾' : '▸' }}
            </span>
          </button>

          <div class="channel-card__mix">
            <button
              type="button"
              class="channel-card__mix-btn"
              :class="{ 'channel-card__mix-btn--active': track.muted && soloTrack == null }"
              title="Mute"
              aria-label="Mute track"
              @click.stop="emit('toggleMute', track.index)"
            >
              M
            </button>
            <button
              type="button"
              class="channel-card__mix-btn"
              :class="{ 'channel-card__mix-btn--active': track.solo }"
              title="Solo"
              aria-label="Solo track"
              @click.stop="emit('toggleSolo', track.index)"
            >
              S
            </button>
          </div>

          <div
            class="channel-card__meter"
            :class="{ 'channel-card__meter--live': isPlaying && triggeredTracks?.[track.index] }"
            aria-hidden="true"
          />
        </div>

        <div v-if="isExpanded(track.index)" class="channel-card__details">
          <template v-if="track.entry">
            <dl class="channel-card__facts">
              <div><dt>Ch</dt><dd>{{ track.entry.channel }}</dd></div>
              <div><dt>Slot</dt><dd>{{ track.midiSlot }}</dd></div>
              <div><dt>MID</dt><dd>{{ track.instrumentId }}</dd></div>
              <div><dt>Notes</dt><dd>{{ track.entry.noteCount.toLocaleString() }}</dd></div>
            </dl>
            <p v-if="track.label !== track.displayName" class="channel-card__full-name">{{ track.label }}</p>
            <div v-if="track.entry.fxMapping.length" class="channel-card__fx">
              <span
                v-for="(mapping, fxIndex) in track.entry.fxMapping"
                :key="fxIndex"
                class="channel-card__fx-chip"
              >
                {{ formatFxMapping(mapping) }}
              </span>
            </div>
          </template>
          <p v-else class="channel-card__idle">Empty track · slot {{ track.midiSlot }} · MID {{ track.instrumentId }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.channel-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-bottom: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 12%),
    var(--bg-panel);
}

.channel-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem var(--sidebar-pad-x) 0.45rem calc(var(--sidebar-pad-x) + var(--sidebar-rail));
  background: linear-gradient(180deg, #1c1c30 0%, #161624 100%);
  border-bottom: 1px solid var(--border);
}

.channel-panel__title {
  margin: 0;
  color: var(--text-bright);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.channel-panel__subtitle {
  color: var(--text-dim);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.channel-panel__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 0;
  padding: 0.35rem var(--sidebar-pad-x) 0.45rem;
  overflow: auto;
}

.channel-card {
  position: relative;
  border: 1px solid var(--border);
  border-left: none;
  background:
    linear-gradient(90deg, var(--ch-bg) 0%, rgba(12, 12, 20, 0.92) 42%, var(--bg-cell) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.channel-card--loaded {
  border-color: color-mix(in srgb, var(--ch-color) 28%, var(--border));
}

.channel-card--selected {
  border-color: color-mix(in srgb, var(--ch-color) 55%, var(--border-light));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 0 1px color-mix(in srgb, var(--ch-color) 35%, transparent),
    0 0 18px var(--ch-glow);
}

.channel-card--playing {
  border-color: var(--play-glow-strong);
  box-shadow:
    inset 0 0 0 1px var(--play-glow),
    0 0 22px var(--play-glow);
  animation: channel-hit 0.38s ease-out;
}

.channel-card__rail {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--sidebar-rail);
  background: linear-gradient(180deg, var(--ch-color) 0%, color-mix(in srgb, var(--ch-color) 40%, #000) 100%);
  box-shadow: 0 0 10px var(--ch-glow);
}

.channel-card__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 0.25rem;
  align-items: center;
  min-height: 2.15rem;
}

.channel-card__select {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.32rem 0.4rem 0.32rem calc(var(--sidebar-rail) + 0.4rem);
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.channel-card__select:hover {
  background: rgba(255, 255, 255, 0.03);
}

.channel-card__select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.channel-card__track-num {
  flex-shrink: 0;
  color: var(--ch-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px var(--ch-glow);
}

.channel-card__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-bright);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-card__hint {
  flex-shrink: 0;
  color: var(--text-dim);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.channel-card__chevron {
  flex-shrink: 0;
  width: 0.75rem;
  color: var(--text-dim);
  font-size: 9px;
  text-align: center;
}

.channel-card--expanded .channel-card__chevron {
  color: var(--ch-color);
}

.channel-card__mix {
  display: flex;
  gap: 0.2rem;
  padding-right: 0.35rem;
}

.channel-card__mix-btn {
  min-width: 1.45rem;
  min-height: 1.45rem;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  background: linear-gradient(180deg, #252538 0%, #1a1a28 100%);
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.1s ease,
    color 0.1s ease,
    background 0.1s ease;
}

.channel-card__mix-btn:hover {
  border-color: var(--accent);
  color: var(--text-bright);
}

.channel-card__mix-btn--active {
  border-color: var(--accent-warm);
  background: linear-gradient(180deg, #3a3020 0%, #2a2218 100%);
  color: var(--accent-warm);
}

.channel-card__meter {
  align-self: stretch;
  min-height: 2.15rem;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.05);
}

.channel-card__meter--live {
  background: linear-gradient(180deg, rgba(110, 200, 255, 0.15) 0%, var(--accent) 50%, rgba(110, 200, 255, 0.15) 100%);
  box-shadow: 0 0 10px var(--play-glow-strong);
  animation: meter-pulse 0.42s ease-out;
}

.channel-card__details {
  padding: 0 0.45rem 0.4rem calc(var(--sidebar-rail) + 0.4rem);
  border-top: 1px solid color-mix(in srgb, var(--ch-color) 18%, var(--border));
  background: rgba(0, 0, 0, 0.2);
}

.channel-card__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
  margin: 0.35rem 0 0;
}

.channel-card__facts div {
  padding: 0.2rem 0.25rem;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.22);
}

.channel-card__facts dt {
  margin: 0;
  color: var(--text-dim);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.channel-card__facts dd {
  margin: 0.08rem 0 0;
  color: var(--text-bright);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.channel-card__full-name {
  margin: 0.3rem 0 0;
  color: var(--text-dim);
  font-size: 9px;
  line-height: 1.35;
}

.channel-card__fx {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.3rem;
}

.channel-card__fx-chip {
  padding: 0.08rem 0.3rem;
  border: 1px solid rgba(184, 168, 255, 0.32);
  background: rgba(184, 168, 255, 0.1);
  color: #e0d4ff;
  font-size: 9px;
  line-height: 1.25;
}

.channel-card__idle {
  margin: 0.35rem 0 0;
  color: var(--text-dim);
  font-size: 9px;
  font-style: italic;
  line-height: 1.4;
}

.channel-card--muted {
  opacity: 0.58;
}

.channel-card--solo .channel-card__mix-btn--active {
  border-color: #ffb347;
  color: #ffd89a;
}

@keyframes channel-hit {
  0% {
    filter: brightness(1.35);
  }
  100% {
    filter: brightness(1);
  }
}

@keyframes meter-pulse {
  0% {
    opacity: 0.35;
    transform: scaleY(0.55);
  }
  40% {
    opacity: 1;
    transform: scaleY(1);
  }
  100% {
    opacity: 0.75;
    transform: scaleY(0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .channel-card--playing {
    animation: none;
  }

  .channel-card__meter--live {
    animation: none;
  }
}
</style>
