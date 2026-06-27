<script setup lang="ts">
/**
 * Session transport — brand, editable song title, pattern nav, playback controls.
 * GM preview badge reminds that browser audio ≠ Tracker+ hardware output.
 */
import { computed, ref } from 'vue'

const props = defineProps<{
  version: string
  title: string
  sourceFilename?: string | null
  bpm: number
  patternName: string
  orderIndex: number
  orderLength: number
  posLabel: string
  octave: number
  octaveRange: string
  loading: boolean
  hasSong: boolean
  isPlaying: boolean
  canPlay: boolean
  loop: boolean
  followPlayhead: boolean
  previewLimited?: boolean
  editableTitle?: boolean
}>()

const editingTitle = ref(false)
const titleDraft = ref('')

const songDisplayTitle = computed(() => {
  if (props.sourceFilename && props.title) {
    return `${props.title} · ${props.sourceFilename}`
  }
  return props.title
})

const emit = defineEmits<{
  load: []
  exportProject: []
  exportPatterns: []
  prevPattern: []
  nextPattern: []
  togglePlay: []
  stopPlay: []
  toggleLoop: []
  toggleFollow: []
  rewindPlay: []
  'update:title': [title: string]
}>()

function startTitleEdit() {
  if (props.loading || props.isPlaying) return
  titleDraft.value = props.title
  editingTitle.value = true
}

function commitTitleEdit() {
  editingTitle.value = false
  const next = titleDraft.value.trim() || 'Untitled'
  if (next !== props.title) {
    emit('update:title', next)
  }
}

function cancelTitleEdit() {
  editingTitle.value = false
  titleDraft.value = props.title
}
</script>

<template>
  <header class="transport">
    <section class="transport__brand" aria-label="MidiTracker">
      <img class="transport__logo" src="/logo-mark.svg?v=din3" width="64" height="64" alt="" />
      <div class="transport__brand-text">
        <div class="transport__title-row">
          <strong class="transport__title">MidiTracker</strong>
          <span class="transport__version">v{{ version }}</span>
        </div>
        <span class="transport__tagline">the grid's not dead</span>
      </div>
    </section>

    <section class="transport__session" aria-label="Session">
      <div class="transport__group transport__group--song">
        <div class="metric metric--song">
          <span class="metric__label">Song</span>
          <input
            v-if="editingTitle"
            class="transport__song-input"
            type="text"
            maxlength="64"
            :value="titleDraft"
            aria-label="Song title"
            @input="titleDraft = ($event.target as HTMLInputElement).value"
            @blur="commitTitleEdit"
            @keydown.enter.prevent="commitTitleEdit"
            @keydown.escape.prevent="cancelTitleEdit"
          />
          <button
            v-else
            type="button"
            class="transport__song-btn"
            :title="`Edit song title — ${songDisplayTitle}`"
            :disabled="loading || isPlaying"
            @click="startTitleEdit"
          >
            {{ title }}
          </button>
          <span v-if="sourceFilename" class="transport__file" :title="sourceFilename">
            {{ sourceFilename }}
          </span>
        </div>
      </div>

      <div class="transport__group transport__group--pattern">
        <div class="metric metric--pattern">
          <span class="metric__label">Pattern</span>
          <span class="metric__value">{{ patternName }}</span>
        </div>
        <div class="transport__pattern-nav tracker-btn-group" aria-label="Song order">
          <button
            type="button"
            class="tracker-btn tracker-btn--icon"
            :disabled="orderIndex <= 0"
            title="Previous song order slot"
            @click="emit('prevPattern')"
          >
            ◀
          </button>
          <span class="transport__pattern-count">
            {{ String(orderIndex + 1).padStart(2, '0') }}/{{ String(orderLength).padStart(2, '0') }}
          </span>
          <button
            type="button"
            class="tracker-btn tracker-btn--icon"
            :disabled="orderIndex >= orderLength - 1"
            title="Next song order slot"
            @click="emit('nextPattern')"
          >
            ▶
          </button>
        </div>
      </div>

      <div class="transport__group transport__group--grid">
        <div class="metric">
          <span class="metric__label">BPM</span>
          <span class="metric__value">{{ bpm }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Pos</span>
          <span class="metric__value">{{ posLabel }}</span>
        </div>
        <div class="metric transport__octave" title="Note entry octave (. lower · / raise)">
          <span class="metric__label">Octave</span>
          <span class="metric__value">{{ octave }} · {{ octaveRange }}</span>
        </div>
      </div>

      <div class="transport__group transport__group--controls">
        <div class="transport__playback-wrap">
          <span class="transport__controls-label">Play</span>
          <div class="transport__playback tracker-btn-group" aria-label="Playback">
            <button
              type="button"
              class="tracker-btn tracker-btn--icon"
              :disabled="loading"
              title="Return to song start"
              @click="emit('rewindPlay')"
            >
              ⏮
            </button>
            <button
              type="button"
              class="tracker-btn tracker-btn--accent tracker-btn--icon"
              :class="{ 'tracker-btn--active': isPlaying }"
              :disabled="!canPlay || loading"
              :title="
                previewLimited
                  ? 'Play / pause (Space) — GM preview follows tempo map'
                  : 'Play / pause from cursor row (Space)'
              "
              @click="emit('togglePlay')"
            >
              {{ isPlaying ? '⏸' : '▶' }}
            </button>
            <button
              type="button"
              class="tracker-btn tracker-btn--icon"
              :disabled="!canPlay || loading"
              title="Stop at current row (does not rewind)"
              @click="emit('stopPlay')"
            >
              ■
            </button>
            <button
              type="button"
              class="tracker-btn tracker-btn--compact"
              :class="{ 'tracker-btn--active': loop }"
              :disabled="loading"
              title="Loop song order"
              @click="emit('toggleLoop')"
            >
              Loop
            </button>
            <button
              type="button"
              class="tracker-btn tracker-btn--compact"
              :class="{ 'tracker-btn--active': followPlayhead }"
              :disabled="loading"
              title="Follow playhead while playing"
              @click="emit('toggleFollow')"
            >
              Follow
            </button>
          </div>
        </div>
        <span
          v-if="previewLimited"
          class="transport__preview-note"
          title="GM SoundFont preview — tempo map and program changes follow; CC FX not auditioned"
        >
          GM preview
        </span>
      </div>
    </section>
  </header>
</template>

<style scoped>
.transport {
  display: flex;
  align-items: stretch;
  min-height: var(--transport-height);
  background: linear-gradient(180deg, #1a1a2a 0%, #12121c 100%);
  border-bottom: 1px solid var(--border);
}

.transport__brand {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  flex-shrink: 0;
  min-width: 17.5rem;
  padding: 0.65rem 2.25rem 0.65rem 1.25rem;
  background: linear-gradient(180deg, #151522 0%, #101018 100%);
  border-right: 1px solid var(--border-light);
  box-shadow: 1px 0 0 rgba(0, 0, 0, 0.35);
}

.transport__logo {
  flex-shrink: 0;
  display: block;
  width: 64px;
  height: 64px;
}

.transport__brand-text {
  min-width: 0;
}

.transport__title-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.transport__title {
  color: var(--brand-blue);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.1;
}

.transport__version {
  color: var(--version-color);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 0 10px rgba(240, 160, 64, 0.35);
}

.transport__tagline {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-dim);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: lowercase;
}

.transport__session {
  display: flex;
  flex: 1;
  align-items: stretch;
  min-width: 0;
  overflow-x: auto;
}

.transport__group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-shrink: 0;
  padding: 0.55rem 1rem;
  border-right: 1px solid var(--border);
}

.transport__group--song {
  min-width: 7rem;
  max-width: 14rem;
}

.transport__group--pattern {
  gap: 0.65rem;
}

.transport__group--grid {
  gap: 1.1rem;
}

.transport__group--controls {
  margin-left: auto;
  gap: 0.55rem;
  align-items: flex-end;
  border-right: none;
  padding-right: 1.1rem;
}

.transport__song-btn,
.transport__song-input {
  display: block;
  max-width: 12rem;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent-warm);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  cursor: text;
}

.transport__song-btn:disabled {
  cursor: default;
  opacity: 0.65;
}

.transport__song-input {
  padding: 0.05rem 0.25rem;
  border: 1px solid var(--accent);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.25);
  outline: none;
}

.metric--song {
  min-width: 0;
  width: 100%;
}

.metric--pattern {
  min-width: 5.5rem;
  max-width: 9rem;
}

.metric--pattern .metric__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transport__file {
  display: block;
  max-width: 12rem;
  overflow: hidden;
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transport__octave .metric__value {
  color: var(--accent-warm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.transport__pattern-nav {
  align-items: stretch;
}

.transport__pattern-nav .transport__pattern-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.85rem;
  padding: 0 0.25rem;
  border-right: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.15);
  color: var(--text-bright);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.transport__controls-label {
  display: block;
  margin-bottom: 0.18rem;
  padding-left: 0.1rem;
  color: var(--text-dim);
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}

.transport__playback-wrap {
  display: flex;
  flex-direction: column;
}

.transport__playback {
  align-items: stretch;
}

.transport__preview-note {
  padding: 0.2rem 0.4rem;
  border: 1px solid rgba(255, 204, 102, 0.35);
  background: rgba(255, 204, 102, 0.08);
  color: var(--warning);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .transport {
    flex-direction: column;
  }

  .transport__brand {
    border-right: none;
    border-bottom: 1px solid var(--border-light);
    box-shadow: none;
  }

  .transport__session {
    flex-wrap: wrap;
    overflow-x: visible;
  }

  .transport__group {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .transport__group--controls {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
    border-bottom: none;
  }
}
</style>
