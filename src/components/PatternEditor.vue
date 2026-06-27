<script setup lang="ts">
/**
 * Pattern grid — 8 tracks × N rows, keyboard-driven entry, playhead highlight.
 */
import { computed, nextTick, ref, watch } from 'vue'
import PatternStep from '@/components/PatternStep.vue'
import type { EditColumn } from '@/lib/pattern-edit'
import { PATTERN_LENGTH_OPTIONS } from '@/lib/pattern-session'
import type { Pattern } from '@/lib/types'
import type { TrackInstrumentLabel } from '@/lib/track-labels'

const props = defineProps<{
  pattern: Pattern
  cursorRow: number
  cursorTrack: number
  cursorColumn: EditColumn
  playheadRow: number
  triggeredTracks: boolean[]
  trackLabels?: TrackInstrumentLabel[]
  editBuffer?: string
  bpm: number
  isPlaying?: boolean
  followPlayhead?: boolean
  tempoRows?: number[]
  previewLimited?: boolean
  showBlankCta?: boolean
}>()

const emit = defineEmits<{
  selectCell: [row: number, track: number, column: EditColumn]
  'update:bpm': [bpm: number]
  'update:patternLength': [length: number]
  loadMidi: []
  loadSample: []
  focusGrid: []
}>()

const rootRef = ref<HTMLElement | null>(null)

const channelColors = [
  'var(--ch-1)',
  'var(--ch-2)',
  'var(--ch-3)',
  'var(--ch-4)',
  'var(--ch-5)',
  'var(--ch-6)',
  'var(--ch-7)',
  'var(--ch-8)',
]

const gridStyle = computed(() => ({
  gridTemplateColumns: `var(--pattern-row-head-width) repeat(8, minmax(var(--pattern-track-min), 1fr))`,
}))

const rows = computed(() => Array.from({ length: props.pattern.length }, (_, index) => index))

function rowLabel(row: number): string {
  return row.toString(16).toUpperCase().padStart(2, '0')
}

function isBeatRow(row: number): boolean {
  return row % 4 === 0
}

function isTempoRow(row: number): boolean {
  return (props.tempoRows ?? []).includes(row)
}

const rowRefs = ref<Record<number, HTMLElement | null>>({})

async function focusCursorCell() {
  // Called when blank CTA dismisses or parent wants keyboard entry on T1.
  await nextTick()
  rowRefs.value[props.cursorRow]?.scrollIntoView({ block: 'nearest' })
  rootRef.value
    ?.querySelector<HTMLButtonElement>('.pattern-step--cursor-track button')
    ?.focus()
}

defineExpose({ focusCursorCell })

function onBpmInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value)) {
    emit('update:bpm', value)
  }
}

function onLengthChange(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  if (!Number.isNaN(value)) {
    emit('update:patternLength', value)
  }
}

function setRowRef(row: number, element: Element | null) {
  rowRefs.value[row] = element as HTMLElement | null
}

watch(
  () => props.showBlankCta,
  (visible) => {
    // Overlay blocks clicks; refocus grid when it hides.
    if (!visible) {
      void focusCursorCell()
    }
  },
)

watch(
  () => [props.isPlaying, props.followPlayhead, props.playheadRow] as const,
  async ([playing, follow, row]) => {
    if (!playing || !follow) return
    await nextTick()
    rowRefs.value[row]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
)
</script>

<template>
  <section ref="rootRef" class="pattern-editor panel">
    <div class="pattern-editor__toolbar panel__title">
      <div class="pattern-editor__title">
        Pattern · {{ pattern.name }} · {{ pattern.length }} rows
      </div>

      <div class="pattern-editor__controls">
        <label class="pattern-editor__control">
          <span>BPM</span>
          <input
            class="pattern-editor__input"
            type="number"
            min="20"
            max="999"
            step="1"
            :value="bpm"
            @change="onBpmInput"
          />
        </label>

        <label class="pattern-editor__control">
          <span>Len</span>
          <select class="pattern-editor__select" :value="pattern.length" @change="onLengthChange">
            <option v-for="option in PATTERN_LENGTH_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
      </div>

      <span class="pattern-editor__hint">
        <template v-if="previewLimited">Preview follows tempo map · </template>
        Z–M notes · . / octave · ? help
      </span>
    </div>

    <div class="pattern-editor__scroll">
      <div
        v-if="showBlankCta"
        class="pattern-editor__blank"
        role="region"
        aria-label="Get started"
      >
        <p class="pattern-editor__blank-title">Empty grid</p>
        <p class="pattern-editor__blank-copy">
          Load a Standard MIDI file, try the sample, or enter notes with
          <kbd>Z</kbd>–<kbd>M</kbd>.
        </p>
        <div class="pattern-editor__blank-actions">
          <div class="tracker-btn-group pattern-editor__blank-group">
            <button
              type="button"
              class="tracker-btn tracker-btn--accent"
              @click="emit('loadMidi')"
            >
              Load MIDI
            </button>
            <button type="button" class="tracker-btn tracker-btn--warm" @click="emit('loadSample')">
              Sample
            </button>
            <button type="button" class="tracker-btn" @click="emit('focusGrid')">
              Enter notes
            </button>
          </div>
        </div>
      </div>

      <div class="pattern-editor__table" :style="gridStyle">
        <div class="pattern-editor__head-row">
          <div class="pattern-editor__corner">#</div>
          <div
            v-for="track in 8"
            :key="track"
            class="pattern-editor__track-head"
            :class="{
              'pattern-editor__track-head--playing':
                isPlaying && triggeredTracks[track - 1],
            }"
            :style="{ '--channel-color': channelColors[track - 1] }"
          >
            <div class="pattern-editor__track-title">
              <span class="pattern-editor__track-label">T{{ track }}</span>
              <span
                v-if="trackLabels?.[track - 1]?.gridName"
                class="pattern-editor__track-name"
                :title="trackLabels[track - 1]?.name"
              >
                {{ trackLabels[track - 1]?.gridName }}
              </span>
            </div>
            <span class="pattern-editor__col-head">NOTE</span>
            <span class="pattern-editor__col-head">INS</span>
            <span class="pattern-editor__col-head">VOL</span>
            <span class="pattern-editor__col-head">FX</span>
            <span class="pattern-editor__col-head">FX</span>
          </div>
        </div>

        <div
          v-for="row in rows"
          :key="row"
          :ref="(element) => setRowRef(row, element as Element | null)"
          class="pattern-editor__row"
          :class="{
            'pattern-editor__row--beat': isBeatRow(row),
            'pattern-editor__row--tempo': isTempoRow(row),
            'pattern-editor__row--cursor': cursorRow === row && !isPlaying,
            'pattern-editor__row--playhead': isPlaying && playheadRow === row,
            'pattern-editor__row--playhead-near':
              isPlaying && Math.abs(playheadRow - row) === 1,
          }"
        >
          <div class="pattern-editor__row-head">{{ rowLabel(row) }}</div>

          <PatternStep
            v-for="track in 8"
            :key="`${row}-${track}`"
            :step="pattern.tracks[track - 1]![row]!"
            :row="row"
            :track="track - 1"
            :channel-color="channelColors[track - 1]!"
            :is-cursor-row="cursorRow === row"
            :is-cursor-track="cursorTrack === track - 1"
            :cursor-column="cursorColumn"
            :edit-buffer="cursorRow === row && cursorTrack === track - 1 && !isPlaying ? editBuffer : ''"
            :is-editing="cursorRow === row && cursorTrack === track - 1 && !isPlaying"
            :is-focused="cursorRow === row && cursorTrack === track - 1 && !isPlaying"
            :is-playhead-row="isPlaying && playheadRow === row"
            :is-triggered="isPlaying && playheadRow === row && triggeredTracks[track - 1]"
            @select="(r, t, column) => emit('selectCell', r, t, column)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pattern-editor {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--bg-grid);
  border-bottom: none;
}

.pattern-editor__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.65rem;
  align-items: center;
}

.pattern-editor__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-editor__controls {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.pattern-editor__control {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-dim);
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pattern-editor__input,
.pattern-editor__select {
  width: 3.25rem;
  padding: 0.1rem 0.25rem;
  border: 1px solid var(--border-light);
  background: var(--bg-cell);
  color: var(--accent-warm);
  font: inherit;
  font-size: 10px;
  font-weight: 600;
}

.pattern-editor__select {
  width: 3.5rem;
}

.pattern-editor__hint {
  justify-self: end;
  color: var(--text-dim);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: none;
}

.pattern-editor__scroll {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 0.35rem 0.5rem;
  position: relative;
}

.pattern-editor__blank {
  position: sticky;
  top: 1.5rem;
  z-index: 2;
  max-width: 26rem;
  margin: 2rem auto 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(24, 24, 40, 0.96) 0%, rgba(16, 16, 24, 0.98) 100%);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  text-align: center;
}

.pattern-editor__blank-title {
  margin: 0 0 0.35rem;
  color: var(--text-bright);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pattern-editor__blank-copy {
  margin: 0 0 0.85rem;
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.45;
}

.pattern-editor__blank-copy kbd {
  padding: 0.05rem 0.25rem;
  border: 1px solid var(--border-light);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--accent-warm);
  font: inherit;
  font-size: 10px;
}

.pattern-editor__blank-actions {
  display: flex;
  justify-content: center;
}

.pattern-editor__blank-group {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.pattern-editor__table {
  display: grid;
  width: 100%;
  gap: 1px;
}

.pattern-editor__head-row,
.pattern-editor__row {
  display: contents;
}

.pattern-editor__corner,
.pattern-editor__track-head,
.pattern-editor__row-head {
  position: sticky;
  z-index: 1;
  background: var(--bg-head);
}

.pattern-editor__corner {
  top: 0;
  left: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 9px;
}

.pattern-editor__track-head {
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: var(--pattern-step-columns);
  grid-template-rows: auto auto;
  gap: 1px;
  min-width: 0;
  padding-left: 2px;
  border-top: 2px solid var(--channel-color);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-left: 2px solid var(--channel-color);
  background: var(--bg-head);
  transition: background 0.12s ease, box-shadow 0.12s ease;
}

.pattern-editor__track-head--playing {
  background: var(--play-bg);
  box-shadow:
    inset 0 0 0 1px var(--play-glow-strong),
    0 0 12px var(--play-glow);
}

.pattern-editor__track-label {
  color: var(--channel-color);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.pattern-editor__track-title {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
  padding: 0.2rem 0.15rem 0.05rem;
}

.pattern-editor__track-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-dim);
  font-size: 7px;
  font-weight: 400;
  line-height: 1.1;
}

.pattern-editor__col-head {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 0.15rem 0.2rem;
  color: var(--text-dim);
  font-size: 7px;
  letter-spacing: 0.02em;
  line-height: 1;
  overflow: hidden;
  white-space: nowrap;
}

.pattern-editor__row-head {
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.35rem;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
  transition: background 0.1s ease, color 0.1s ease, box-shadow 0.1s ease;
}

.pattern-editor__row--beat .pattern-editor__row-head {
  color: var(--accent-warm);
  background: #1f1f30;
}

.pattern-editor__row--cursor .pattern-editor__row-head {
  color: var(--text-bright);
  background: #2a3050;
  box-shadow: inset 0 0 0 1px var(--accent);
}

.pattern-editor__row--playhead .pattern-editor__row-head {
  color: #dff4ff;
  background: linear-gradient(90deg, var(--play-bg) 0%, var(--play-bg-bright) 100%);
  box-shadow:
    inset 0 0 0 1px var(--play-glow-strong),
    0 0 14px var(--play-glow);
  animation: playhead-pulse 0.55s ease-in-out infinite alternate;
}

.pattern-editor__row--playhead-near :deep(.pattern-step) {
  background: var(--play-bg-near);
}

.pattern-editor__row--playhead :deep(.pattern-step) {
  background: var(--play-bg-row);
}

.pattern-editor__row--tempo .pattern-editor__row-head {
  color: #ffcc66;
  background: #2a2838;
  box-shadow: inset 0 0 0 1px rgba(255, 204, 102, 0.45);
}

.pattern-editor__row--beat :deep(.pattern-step) {
  background: var(--bg-cell-beat);
}

@keyframes playhead-pulse {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.12);
  }
}

@media (max-width: 960px) {
  .pattern-editor__toolbar {
    grid-template-columns: 1fr;
  }

  .pattern-editor__hint {
    justify-self: start;
  }
}
</style>
