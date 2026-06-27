<script setup lang="ts">
import { computed, ref } from 'vue'
import InfoPanel from '@/components/InfoPanel.vue'
import SongOrderPanel from '@/components/SongOrderPanel.vue'
import TempoPanel from '@/components/TempoPanel.vue'
import ValidationPanel from '@/components/ValidationPanel.vue'
import { hasImportLossNotes } from '@/lib/import-loss'
import type { ExportValidationResult } from '@/lib/export/validate-export'
import type { MidiChannelMapEntry, MidiImportReport, Pattern, TrackerSong } from '@/lib/types'
import type { TempoMapEntry } from '@/lib/midi/tempo-map'

type SessionTab = 'song' | 'import' | 'tempo' | 'export'

const SESSION_TABS: SessionTab[] = ['song', 'import', 'export', 'tempo']

const props = defineProps<{
  loaded: boolean
  report: MidiImportReport
  song: TrackerSong
  patterns: Pattern[]
  songOrder: number[]
  selectedOrderIndex: number
  tempoMap: TempoMapEntry[]
  tempoFxPlaced: number
  validation: ExportValidationResult | null
  validationHighlight?: boolean
  channelMap?: MidiChannelMapEntry[]
}>()

const emit = defineEmits<{
  selectOrder: [orderIndex: number]
  moveOrderUp: [orderIndex: number]
  moveOrderDown: [orderIndex: number]
  duplicateOrder: [orderIndex: number]
  removeOrder: [orderIndex: number]
  appendOrder: [patternIndex: number]
}>()

const expanded = ref(false)
const activeTab = ref<SessionTab>('song')

const importHasNotes = computed(() => props.loaded && hasImportLossNotes(props.report))
const exportHasIssue = computed(
  () => props.validation != null && (!props.validation.ok || props.validation.warnings.length > 0),
)
const hasTempoMap = computed(
  () => props.loaded && props.tempoMap.length > 0 && props.report.tempoChangeCount > 0,
)

const tabMeta: Record<SessionTab, { label: string; hint: string }> = {
  song: { label: 'Song', hint: 'Playlist & pattern order' },
  import: { label: 'Import', hint: 'MIDI conversion report' },
  export: { label: 'Export', hint: 'Tracker+ validation' },
  tempo: { label: 'Tempo', hint: 'BPM map & splits' },
}

const paneHeadline = computed(() => {
  switch (activeTab.value) {
    case 'song':
      return props.loaded ? `${props.songOrder.length} slot(s)` : 'Blank song'
    case 'import':
      if (!props.loaded) return 'No MIDI loaded'
      return props.report.sourceFilename ?? props.report.title ?? 'Import report'
    case 'export':
      if (!props.validation) return 'Not validated yet'
      if (!props.validation.ok) return 'Validation failed'
      if (props.validation.warnings.length > 0) {
        return `${props.validation.warnings.length} hardware note(s)`
      }
      return 'Ready for Tracker+'
    case 'tempo':
      if (!props.loaded) return 'No MIDI loaded'
      if (!hasTempoMap.value) return 'Single tempo'
      return `${props.report.tempoChangeCount} tempo change(s)`
    default:
      return ''
  }
})

const paneSubtitle = computed(() => tabMeta[activeTab.value].hint)

const collapsedTitle = computed(() => {
  if (!props.loaded) return 'Blank song'
  return props.report.sourceFilename ?? props.song.title ?? 'Untitled'
})

const collapsedMeta = computed(() => {
  const pattern = props.patterns[props.songOrder[props.selectedOrderIndex] ?? 0]?.name ?? 'Pattern'
  if (!props.loaded) return pattern
  return `${pattern} · ${props.report.noteCount.toLocaleString()} notes`
})

function tabHasAlert(tab: SessionTab): boolean {
  if (tab === 'import') return importHasNotes.value
  if (tab === 'export') return exportHasIssue.value
  return false
}

function toggleExpanded() {
  expanded.value = !expanded.value
}

function selectTab(tab: SessionTab) {
  activeTab.value = tab
  expanded.value = true
}

function focusImportTab() {
  activeTab.value = 'import'
  expanded.value = true
}

function focusExportTab() {
  activeTab.value = 'export'
  expanded.value = true
}

defineExpose({
  focusImportTab,
  focusExportTab,
})
</script>

<template>
  <section class="session" :class="{ 'session--open': expanded }">
    <button type="button" class="session__handle" @click="toggleExpanded">
      <span class="session__chev" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
      <div class="session__head">
        <div class="session__head-row">
          <span class="session__kicker">Session</span>
          <span class="session__file" :title="collapsedTitle">{{ collapsedTitle }}</span>
        </div>
        <span class="session__meta">{{ collapsedMeta }}</span>
      </div>
      <span class="session__signals" aria-hidden="true">
        <span v-if="importHasNotes" class="session__signal session__signal--warn" title="Import notes" />
        <span v-if="exportHasIssue" class="session__signal session__signal--fail" title="Export notes" />
      </span>
    </button>

    <div v-show="expanded" class="session__body">
      <div class="session__seg" role="tablist">
        <button
          v-for="tab in SESSION_TABS"
          :key="tab"
          type="button"
          class="session__seg-btn"
          :class="{ 'session__seg-btn--active': activeTab === tab }"
          role="tab"
          :aria-selected="activeTab === tab"
          @click="selectTab(tab)"
        >
          <span class="session__seg-label">{{ tabMeta[tab].label }}</span>
          <span v-if="tabHasAlert(tab)" class="session__seg-dot" aria-hidden="true" />
        </button>
      </div>

      <header class="session__pane-head">
        <h3 class="session__pane-title">{{ paneHeadline }}</h3>
        <p class="session__pane-sub">{{ paneSubtitle }}</p>
      </header>

      <div class="session__pane">
        <SongOrderPanel
          v-show="activeTab === 'song'"
          embedded
          :patterns="patterns"
          :song-order="songOrder"
          :selected-order-index="selectedOrderIndex"
          @select="emit('selectOrder', $event)"
          @move-up="emit('moveOrderUp', $event)"
          @move-down="emit('moveOrderDown', $event)"
          @duplicate="emit('duplicateOrder', $event)"
          @remove="emit('removeOrder', $event)"
          @append="emit('appendOrder', $event)"
        />

        <InfoPanel v-show="activeTab === 'import'" embedded :report="report" :loaded="loaded" />

        <ValidationPanel
          v-show="activeTab === 'export'"
          embedded
          :validation="validation"
          :loaded="loaded"
          :highlight="validationHighlight"
          :channel-map="channelMap"
        />

        <TempoPanel
          v-show="activeTab === 'tempo'"
          embedded
          :tempo-map="tempoMap"
          :loaded="loaded"
          :tempo-fx-placed="tempoFxPlaced"
          :tempo-change-count="report.tempoChangeCount"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.session {
  flex-shrink: 0;
  border-top: 1px solid var(--border-light);
  background: #0c0c14;
}

.session__handle {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  width: 100%;
  padding: 0.42rem var(--sidebar-pad-x) 0.42rem calc(var(--sidebar-pad-x) + var(--sidebar-rail));
  border: none;
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.session__handle:hover {
  background: rgba(255, 255, 255, 0.03);
}

.session--open .session__handle {
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, #181828 0%, #12121c 100%);
}

.session__chev {
  color: var(--accent-warm);
  font-size: 10px;
  font-weight: 700;
}

.session__head {
  flex: 1;
  min-width: 0;
}

.session__head-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
}

.session__kicker {
  flex-shrink: 0;
  color: var(--text-bright);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.session__file {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-size: 9px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session__meta {
  display: block;
  margin-top: 0.1rem;
  overflow: hidden;
  color: var(--text-dim);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session__signals {
  display: flex;
  gap: 0.2rem;
  flex-shrink: 0;
}

.session__signal {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 1px;
}

.session__signal--warn {
  background: var(--warning);
  box-shadow: 0 0 6px rgba(255, 204, 102, 0.55);
}

.session__signal--fail {
  background: var(--danger);
  box-shadow: 0 0 6px rgba(255, 122, 122, 0.45);
}

.session__body {
  display: flex;
  flex-direction: column;
  height: var(--session-drawer-height);
  min-height: var(--session-drawer-height);
  max-height: var(--session-drawer-height);
}

.session__seg {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  flex-shrink: 0;
  padding: 0.35rem var(--sidebar-pad-x) 0 calc(var(--sidebar-pad-x) + var(--sidebar-rail));
  background: var(--border);
}

.session__seg-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.32rem 0.2rem;
  border: none;
  background: #14141f;
  color: var(--text-dim);
  font: inherit;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

.session__seg-btn:hover {
  color: var(--text);
  background: #1a1a28;
}

.session__seg-btn--active {
  background: var(--bg-panel);
  color: var(--accent-warm);
  box-shadow: inset 0 2px 0 var(--accent-warm);
}

.session__seg-dot {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 1px;
  background: var(--warning);
}

.session__pane-head {
  flex-shrink: 0;
  padding: 0.4rem var(--sidebar-pad-x) 0.35rem calc(var(--sidebar-pad-x) + var(--sidebar-rail));
  border-bottom: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.15);
}

.session__pane-title {
  margin: 0;
  overflow: hidden;
  color: var(--text-bright);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session__pane-sub {
  margin: 0.12rem 0 0;
  color: var(--text-dim);
  font-size: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.session__pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-panel);
}

.session__pane :deep(.panel) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border-bottom: none;
  overflow: hidden;
}

.session__pane :deep(.panel__title) {
  display: none;
}

.session__pane :deep(.panel__body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.45rem var(--sidebar-pad-x) 0.5rem calc(var(--sidebar-pad-x) + var(--sidebar-rail));
}

.session__pane :deep(.validation-panel__live) {
  margin: 0 calc(-1 * var(--sidebar-pad-x)) 0 calc(-1 * (var(--sidebar-pad-x) + var(--sidebar-rail)));
  padding-left: calc(var(--sidebar-pad-x) + var(--sidebar-rail));
  padding-right: var(--sidebar-pad-x);
}

.session__pane :deep(.validation-panel--embedded) {
  overflow: hidden;
}

.session__pane :deep(.validation-panel--embedded .panel__body) {
  padding-top: 0.35rem;
}
</style>
