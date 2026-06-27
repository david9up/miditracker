<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExportValidationResult } from '@/lib/export/validate-export'
import type { MidiChannelMapEntry } from '@/lib/types'

const props = defineProps<{
  validation: ExportValidationResult | null
  loaded: boolean
  highlight?: boolean
  channelMap?: MidiChannelMapEntry[]
  embedded?: boolean
}>()

const rootRef = ref<HTMLElement | null>(null)

const liveSummary = computed(() => {
  if (!props.validation) return ''
  if (props.validation.ok && props.validation.warnings.length === 0) {
    return 'Export validation passed. Software round-trip OK.'
  }
  const failed = props.validation.checks.filter((check) => !check.ok).length
  const parts: string[] = []
  if (failed > 0) parts.push(`${failed} validation check(s) failed`)
  if (props.validation.warnings.length > 0) {
    parts.push(`${props.validation.warnings.length} hardware note(s)`)
  }
  if (parts.length === 0) return 'Export validation completed with warnings.'
  return `Export validation: ${parts.join(', ')}.`
})

defineExpose({
  scrollIntoView: () => {
    rootRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
})
</script>

<template>
  <section
    ref="rootRef"
    class="validation-panel panel"
    :class="{
      'validation-panel--highlight': highlight,
      'validation-panel--embedded': embedded,
    }"
    :aria-labelledby="embedded ? undefined : 'validation-panel-title'"
  >
    <h2 v-if="!embedded" id="validation-panel-title" class="panel__title">Export validation</h2>
    <p
      v-if="validation"
      class="validation-panel__live"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ liveSummary }}
    </p>
    <div class="panel__body">
      <template v-if="validation">
        <ul class="validation-list">
          <li
            v-for="check in validation.checks"
            :key="check.id"
            class="validation-item"
            :class="check.ok ? 'validation-item--ok' : 'validation-item--fail'"
          >
            <span class="validation-item__mark">{{ check.ok ? '✓' : '✗' }}</span>
            <span class="validation-item__label">{{ check.label }}</span>
            <span v-if="check.detail" class="validation-item__detail">{{ check.detail }}</span>
          </li>
        </ul>

        <div v-if="channelMap?.length" class="validation-routing">
          <h3 class="validation-notes__title">Tracker+ MIDI routing</h3>
          <p class="validation-routing__intro">
            Enable MIDI Out on these hardware slots and match source channels on your module.
          </p>
          <ul class="validation-routing__list">
            <li v-for="entry in channelMap" :key="entry.track">
              T{{ entry.track }} → slot {{ entry.trackerSlot }} (Ch {{ entry.channel }}) · {{ entry.name }}
            </li>
          </ul>
        </div>

        <div v-if="validation.warnings.length" class="validation-notes">
          <h3 class="validation-notes__title">Hardware notes</h3>
          <ul>
            <li v-for="(warning, index) in validation.warnings" :key="index">{{ warning }}</li>
          </ul>
        </div>

        <p v-if="validation.ok" class="validation-summary validation-summary--ok">
          Software round-trip OK — load ZIP on Tracker+ and confirm MIDI routing above.
          Compare on hardware with <strong>MIDI Reference</strong> or <strong>Source MIDI</strong> in the menu.
        </p>
        <p v-else class="validation-summary validation-summary--fail">
          Fix export errors before loading on hardware.
        </p>
      </template>

      <p v-else class="validation-empty">
        Import or save a project to run tracker-lib round-trip checks on patterns, project.mt, and metadata.
      </p>
    </div>
  </section>
</template>

<style scoped>
.validation-panel {
  min-height: 0;
  border-bottom: 1px solid var(--border);
}

.validation-panel--embedded {
  border-bottom: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.validation-panel--embedded .validation-panel__live {
  flex-shrink: 0;
  padding-left: 0.55rem;
  padding-right: 0.55rem;
}

.validation-panel--embedded .panel__body {
  flex: 1;
  min-height: 0;
  max-height: none;
  padding: 0.45rem 0.55rem;
  overflow: auto;
}

.validation-panel__live {
  margin: 0;
  padding: 0.3rem var(--sidebar-pad-x) 0.3rem calc(var(--sidebar-pad-x) + var(--sidebar-rail));
  border-bottom: 1px solid var(--border);
  background: rgba(110, 200, 255, 0.06);
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.4;
}

.validation-panel--highlight {
  animation: validation-pulse 1.2s ease-out 2;
  box-shadow: inset 0 0 0 1px rgba(255, 204, 102, 0.35);
}

.validation-panel .panel__body {
  max-height: 11rem;
  overflow: auto;
}

.validation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

.validation-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.4rem;
  padding: 0.3rem 0.35rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
  font-size: 10px;
}

.validation-item--ok {
  border-left: 2px solid var(--success);
}

.validation-item--fail {
  border-left: 2px solid var(--danger);
}

.validation-item__mark {
  grid-row: span 2;
  align-self: center;
  font-weight: 700;
}

.validation-item--ok .validation-item__mark {
  color: var(--success);
}

.validation-item--fail .validation-item__mark {
  color: var(--danger);
}

.validation-item__label {
  color: var(--text-bright);
}

.validation-item__detail {
  grid-column: 2;
  color: var(--text-dim);
  font-size: 9px;
  line-height: 1.35;
}

.validation-routing {
  margin-top: 0.45rem;
  padding: 0.35rem;
  border: 1px solid rgba(110, 200, 255, 0.22);
  background: rgba(110, 200, 255, 0.05);
}

.validation-routing__intro {
  margin: 0 0 0.3rem;
  color: var(--text-dim);
  font-size: 9px;
  line-height: 1.4;
}

.validation-routing__list {
  margin: 0;
  padding-left: 1rem;
  color: var(--text);
  font-size: 9px;
  line-height: 1.45;
}

.validation-notes {
  margin-top: 0.45rem;
  padding: 0.35rem;
  border: 1px solid rgba(255, 204, 102, 0.25);
  background: rgba(255, 204, 102, 0.06);
}

.validation-notes__title {
  margin: 0 0 0.25rem;
  color: var(--warning);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.validation-notes ul {
  margin: 0;
  padding-left: 1rem;
  color: var(--text-dim);
  font-size: 9px;
  line-height: 1.45;
}

.validation-summary {
  margin: 0.45rem 0 0;
  font-size: 9px;
  line-height: 1.45;
}

.validation-summary--ok {
  color: var(--success);
}

.validation-summary--fail {
  color: var(--danger);
}

.validation-empty {
  margin: 0;
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.5;
}

@keyframes validation-pulse {
  0% {
    background: rgba(255, 204, 102, 0.12);
  }
  100% {
    background: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .validation-panel--highlight {
    animation: none;
    background: rgba(255, 204, 102, 0.08);
  }
}
</style>
