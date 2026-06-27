<script setup lang="ts">
import { computed } from 'vue'
import { fxSymbolForIndex } from '@/lib/midi/midi-fx'
import { columnForFxSlot, type EditColumn } from '@/lib/pattern-edit'
import type { Step } from '@/lib/types'
import { noteToString } from '@/lib/utils'

const props = defineProps<{
  step: Step
  row: number
  track: number
  channelColor: string
  isCursorRow: boolean
  isCursorTrack: boolean
  cursorColumn: EditColumn
  editBuffer?: string
  isEditing?: boolean
  isFocused?: boolean
  isPlayheadRow?: boolean
  isTriggered?: boolean
}>()

const emit = defineEmits<{
  select: [row: number, track: number, column: EditColumn]
}>()

function formatInstrument(value: number): string {
  if (value <= 0) return '..'
  return value.toString(16).toUpperCase().padStart(2, '0')
}

function formatVolume(value: number): string {
  if (value <= 0) return '...'
  return Math.min(100, Math.max(0, value)).toString().padStart(3, '0')
}

function formatFxValue(value: number): string {
  if (value <= 0) return '···'
  return value.toString().padStart(3, '0')
}

function displayInstrument(): string {
  if (props.isEditing && props.cursorColumn === 'instrument') {
    if (props.editBuffer) {
      return props.editBuffer.padEnd(2, '·').slice(0, 2).toUpperCase()
    }
    return '··'
  }
  return formatInstrument(props.step.instrument)
}

function displayVolume(): string {
  if (props.isEditing && props.cursorColumn === 'volume') {
    if (props.editBuffer) {
      return props.editBuffer.padEnd(3, '·').slice(0, 3)
    }
    return '···'
  }
  return formatVolume(props.step.volume)
}

function fxParts(slot: 1 | 2) {
  const typeColumn = columnForFxSlot(slot, 'type')
  const valueColumn = columnForFxSlot(slot, 'value')
  const type = slot === 1 ? props.step.fx1Type : props.step.fx2Type
  const value = slot === 1 ? props.step.fx1Value : props.step.fx2Value
  const typeActive = Boolean(props.isEditing && props.cursorColumn === typeColumn)
  const valueActive = Boolean(props.isEditing && props.cursorColumn === valueColumn)

  let typeText = type > 0 ? fxSymbolForIndex(type) : '·'
  let valueText = formatFxValue(value)

  if (typeActive && props.editBuffer) {
    typeText = props.editBuffer.padEnd(2, '·').slice(0, 2).toUpperCase()
  } else if (typeActive) {
    typeText = '·'
  }

  if (valueActive && props.editBuffer) {
    valueText = props.editBuffer.padEnd(2, '·').slice(0, 2).toUpperCase()
  } else if (valueActive) {
    valueText = '··'
  }

  return { typeText, valueText, typeActive, valueActive, typeColumn, valueColumn }
}

function cellClass(column: EditColumn, filled = false) {
  const active =
    props.isCursorRow &&
    props.isCursorTrack &&
    (props.cursorColumn === column ||
      (column === 'fx1Type' &&
        (props.cursorColumn === 'fx1Type' || props.cursorColumn === 'fx1Value')) ||
      (column === 'fx2Type' &&
        (props.cursorColumn === 'fx2Type' || props.cursorColumn === 'fx2Value')))

  return {
    'pattern-step__cell': true,
    'pattern-step__cell--note': column === 'note',
    'pattern-step__cell--inst': column === 'instrument',
    'pattern-step__cell--vol': column === 'volume',
    'pattern-step__cell--fx': column === 'fx1Type' || column === 'fx2Type',
    'pattern-step__cell--filled': filled,
    'pattern-step__cell--active': active,
    'pattern-step__cell--editing': active && Boolean(props.editBuffer),
    'pattern-step__cell--triggered':
      props.isTriggered && (column === 'note' ? filled : column === 'instrument' && filled),
  }
}

function onSelect(column: EditColumn) {
  emit('select', props.row, props.track, column)
}

function onFxSelect(slot: 1 | 2, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const part = event.clientX < rect.left + rect.width / 2 ? 'type' : 'value'
  emit('select', props.row, props.track, columnForFxSlot(slot, part))
}

const noteFilled = computed(() => props.step.note >= 0)
const instFilled = computed(() => props.step.instrument > 0)
const fx1 = computed(() => fxParts(1))
const fx2 = computed(() => fxParts(2))
</script>

<template>
  <div
    class="pattern-step"
    :class="{
      'pattern-step--cursor-track': isCursorRow && isCursorTrack,
      'pattern-step--playhead': isPlayheadRow,
      'pattern-step--triggered': isTriggered,
    }"
    :style="{ '--channel-color': channelColor }"
  >
    <button
      type="button"
      :tabindex="isFocused ? 0 : -1"
      :class="cellClass('note', noteFilled)"
      :title="noteFilled ? noteToString(step.note) : undefined"
      @mousedown.prevent
      @click="onSelect('note')"
    >
      {{ noteToString(step.note) }}
    </button>
    <button
      type="button"
      tabindex="-1"
      :class="cellClass('instrument', instFilled || noteFilled)"
      @mousedown.prevent
      @click="onSelect('instrument')"
    >
      {{ displayInstrument() }}
    </button>
    <button
      type="button"
      tabindex="-1"
      :class="cellClass('volume')"
      @mousedown.prevent
      @click="onSelect('volume')"
    >
      {{ displayVolume() }}
    </button>
    <button
      type="button"
      tabindex="-1"
      :class="cellClass('fx1Type')"
      @mousedown.prevent
      @click="onFxSelect(1, $event)"
    >
      <span
        class="pattern-step__fx-type"
        :class="{ 'pattern-step__fx-part--active': fx1.typeActive }"
      >
        {{ fx1.typeText }}
      </span>
      <span
        class="pattern-step__fx-value"
        :class="{ 'pattern-step__fx-part--active': fx1.valueActive }"
      >
        {{ fx1.valueText }}
      </span>
    </button>
    <button
      type="button"
      tabindex="-1"
      :class="cellClass('fx2Type')"
      @mousedown.prevent
      @click="onFxSelect(2, $event)"
    >
      <span
        class="pattern-step__fx-type"
        :class="{ 'pattern-step__fx-part--active': fx2.typeActive }"
      >
        {{ fx2.typeText }}
      </span>
      <span
        class="pattern-step__fx-value"
        :class="{ 'pattern-step__fx-part--active': fx2.valueActive }"
      >
        {{ fx2.valueText }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.pattern-step {
  display: grid;
  grid-template-columns: var(--pattern-step-columns);
  gap: 1px;
  min-height: 1.35rem;
  min-width: 0;
  padding-left: 2px;
  border-left: 2px solid var(--channel-color);
  background: var(--bg-cell);
  transition: background 0.1s ease, box-shadow 0.1s ease;
}

.pattern-step--cursor-track {
  box-shadow: inset 0 0 0 1px rgba(110, 200, 255, 0.22);
}

.pattern-step--playhead {
  box-shadow: inset 0 0 0 1px var(--play-glow);
}

.pattern-step--triggered {
  box-shadow:
    inset 0 0 0 1px var(--play-glow-strong),
    0 0 10px var(--play-glow);
  animation: step-flash 0.42s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .pattern-step--triggered {
    animation: none;
  }
}

.pattern-step__cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 0.15rem;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  text-align: left;
}

.pattern-step__cell--fx {
  gap: 0.05rem;
  padding: 0;
}

.pattern-step__fx-type,
.pattern-step__fx-value {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 100%;
  padding: 0 0.1rem;
}

.pattern-step__fx-type {
  flex: 0 0 0.85rem;
  justify-content: center;
  color: #c8b8ff;
}

.pattern-step__fx-value {
  flex: 1;
  color: #9888dd;
  font-variant-numeric: tabular-nums;
}

.pattern-step__fx-part--active {
  background: rgba(110, 200, 255, 0.14);
  box-shadow: inset 0 0 0 1px var(--accent-warm);
  color: var(--text-bright);
}

.pattern-step__cell:hover {
  background: rgba(255, 255, 255, 0.04);
}

.pattern-step__cell--note.pattern-step__cell--filled {
  color: var(--success);
  font-weight: 600;
}

.pattern-step__cell--inst.pattern-step__cell--filled {
  color: #ffd866;
  font-weight: 600;
}

.pattern-step__cell--fx {
  color: #b8a8ff;
}

.pattern-step__cell--active {
  background: #2a3050;
  color: var(--text-bright);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.pattern-step__cell--editing {
  color: var(--accent-warm);
  font-weight: 600;
}

.pattern-step__cell--triggered {
  background: rgba(110, 200, 255, 0.16);
  color: var(--text-bright);
}

@keyframes step-flash {
  0% {
    background: rgba(110, 200, 255, 0.3);
  }
  100% {
    background: transparent;
  }
}
</style>
