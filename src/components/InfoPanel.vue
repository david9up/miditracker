<script setup lang="ts">
import { computed } from 'vue'
import { hasImportLossNotes } from '@/lib/import-loss'
import type { MidiImportReport } from '@/lib/types'

const props = defineProps<{
  report: MidiImportReport
  loaded: boolean
  embedded?: boolean
}>()

const showConversionNotes = computed(() => props.loaded && hasImportLossNotes(props.report))

const quickStats = computed(() => {
  if (!props.loaded) return []
  return [
    { label: 'Notes', value: props.report.noteCount.toLocaleString() },
    { label: 'Patterns', value: String(props.report.patternCount) },
    { label: 'Channels', value: `${props.report.channelsUsed}/${props.report.channelCount}` },
    { label: 'Length', value: `${props.report.durationSeconds.toFixed(1)}s` },
  ]
})
</script>

<template>
  <section class="import-pane panel" :class="{ 'import-pane--embedded': embedded }">
    <h2 v-if="!embedded" class="panel__title">Import</h2>
    <div class="panel__body">
      <template v-if="loaded">
        <div class="import-pane__stats">
          <div v-for="stat in quickStats" :key="stat.label" class="import-pane__stat">
            <span class="import-pane__stat-value">{{ stat.value }}</span>
            <span class="import-pane__stat-label">{{ stat.label }}</span>
          </div>
        </div>

        <details class="import-pane__tech">
          <summary>Technical details</summary>
          <dl class="import-pane__grid">
            <div><dt>PPQ</dt><dd>{{ report.ppq }}</dd></div>
            <div><dt>Tempo Δ</dt><dd>{{ report.tempoChangeCount }}</dd></div>
            <div><dt>CC</dt><dd>{{ report.ccEventCount }}</dd></div>
            <div><dt>PC</dt><dd>{{ report.programChangeCount }}</dd></div>
            <div :class="{ 'import-pane__warn': report.skippedNotes > 0 }">
              <dt>Skip notes</dt>
              <dd>{{ report.skippedNotes.toLocaleString() }}</dd>
            </div>
            <div :class="{ 'import-pane__warn': report.skippedFxEvents > 0 }">
              <dt>Skip FX</dt>
              <dd>{{ report.skippedFxEvents }}</dd>
            </div>
          </dl>
        </details>

        <div v-if="showConversionNotes" class="import-pane__issues">
          <h4 class="import-pane__issues-title">Conversion notes</h4>
          <ul>
            <li v-if="report.droppedChannels > 0">
              {{ report.droppedChannels }} channel(s) dropped:
              {{ report.droppedChannelNames.join(', ') }}
            </li>
            <li v-if="report.skippedNotes > 0">
              {{ report.skippedNotes.toLocaleString() }} note(s) skipped (no free row after chord spread)
            </li>
            <li v-if="report.skippedFxEvents > 0">
              {{ report.skippedFxEvents.toLocaleString() }} FX event(s) unmapped
            </li>
          </ul>
        </div>
      </template>

      <p v-else class="import-pane__empty">
        No MIDI loaded yet. Use <strong>Load MIDI</strong> or drag a <strong>.mid</strong> file onto the grid.
      </p>
    </div>
  </section>
</template>

<style scoped>
.import-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.import-pane .panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.import-pane__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
}

.import-pane__stat {
  padding: 0.3rem 0.25rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
  text-align: center;
}

.import-pane__stat-value {
  display: block;
  color: var(--text-bright);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.import-pane__stat-label {
  display: block;
  margin-top: 0.1rem;
  color: var(--text-dim);
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-pane__tech {
  margin-top: 0.45rem;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.18);
}

.import-pane__tech summary {
  padding: 0.3rem 0.4rem;
  color: var(--text-dim);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  list-style: none;
}

.import-pane__tech summary::-webkit-details-marker {
  display: none;
}

.import-pane__tech summary::before {
  content: '▸ ';
  color: var(--accent-warm);
}

.import-pane__tech[open] summary::before {
  content: '▾ ';
}

.import-pane__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem;
  margin: 0;
  padding: 0 0.35rem 0.35rem;
}

.import-pane__grid div {
  padding: 0.18rem 0.25rem;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.22);
}

.import-pane__grid dt {
  margin: 0;
  color: var(--text-dim);
  font-size: 7px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-pane__grid dd {
  margin: 0.05rem 0 0;
  color: var(--text-bright);
  font-size: 10px;
  font-weight: 600;
}

.import-pane__warn dd {
  color: var(--warning);
}

.import-pane__issues {
  margin-top: 0.45rem;
  padding: 0.35rem 0.4rem;
  border-left: 2px solid var(--warning);
  background: rgba(255, 204, 102, 0.06);
}

.import-pane__issues-title {
  margin: 0 0 0.2rem;
  color: var(--warning);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.import-pane__issues ul {
  margin: 0;
  padding-left: 1rem;
  color: var(--text);
  font-size: 9px;
  line-height: 1.45;
}

.import-pane__empty strong {
  color: var(--accent-warm);
  font-weight: 600;
}

.import-pane__empty {
  margin: 0;
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}
</style>
