<script setup lang="ts">
import { computed } from 'vue'
import type { TempoMapEntry } from '@/lib/midi/tempo-map'

const props = defineProps<{
  tempoMap: TempoMapEntry[]
  loaded: boolean
  tempoFxPlaced: number
  tempoChangeCount?: number
  embedded?: boolean
}>()

const hasMap = computed(
  () => props.loaded && props.tempoMap.length > 0 && (props.tempoChangeCount ?? 0) > 0,
)

function rowLabel(row: number): string {
  return row.toString(16).toUpperCase().padStart(2, '0')
}
</script>

<template>
  <section class="tempo-panel panel" :class="{ 'tempo-panel--embedded': embedded }">
    <h2 v-if="!embedded" class="panel__title">Tempo map</h2>
    <div class="panel__body">
      <template v-if="hasMap">
        <table>
          <thead>
            <tr>
              <th>Row</th>
              <th>BPM</th>
              <th>FX</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, index) in tempoMap" :key="`${entry.row}-${entry.bpm}`">
              <td>{{ rowLabel(entry.row) }}</td>
              <td>{{ entry.bpm }}</td>
              <td>
                <span v-if="index === 0 && entry.row === 0">project</span>
                <span v-else class="tempo-panel__fx">T{{ entry.bpm }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="tempo-panel__meta">
          {{ tempoFxPlaced }} tempo FX on T1 ·
          {{ tempoMap.filter((entry) => entry.patternSplit).length }} pattern split(s)
        </p>
      </template>

      <p v-else-if="!loaded" class="tempo-panel__empty">
        No MIDI loaded yet. Tempo map appears here after import when the file has BPM changes.
      </p>

      <p v-else class="tempo-panel__empty">
        Single project tempo — no mid-song BPM changes. Grid uses 4 rows/beat at the song BPM.
      </p>
    </div>
  </section>
</template>

<style scoped>
.tempo-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.tempo-panel .panel__body {
  overflow: auto;
}

.tempo-panel--embedded {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tempo-panel--embedded .panel__body {
  flex: 1;
  min-height: 0;
  padding-top: 0.35rem;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

th,
td {
  padding: 0.25rem 0.3rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

th {
  color: var(--text-dim);
  font-weight: 500;
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tempo-panel__fx {
  color: var(--accent-warm);
}

.tempo-panel__meta {
  margin: 0.4rem 0 0;
  color: var(--text-dim);
  font-size: 9px;
}

.tempo-panel__empty {
  margin: 0;
  padding: 0.35rem;
  border: 1px dashed var(--border);
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.45;
  text-align: center;
}
</style>
