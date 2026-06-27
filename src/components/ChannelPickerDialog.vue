<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  channelPickerCandidates,
  channelPickerFilename,
  channelPickerVisible,
  finishChannelPickerDialog,
} from '@/lib/channel-picker-state'

const MAX_TRACKS = 8

const dialogRef = ref<HTMLDialogElement | null>(null)
const selected = ref<number[]>([])

watch(channelPickerVisible, (visible) => {
  const dialog = dialogRef.value
  if (!visible) {
    if (dialog?.open) dialog.close()
    return
  }

  selected.value = channelPickerCandidates.value
    .slice(0, MAX_TRACKS)
    .map((candidate) => candidate.channel)

  if (dialog && !dialog.open) {
    dialog.showModal()
  }
})

const selectionCount = computed(() => selected.value.length)
const canConfirm = computed(
  () => selectionCount.value > 0 && selectionCount.value <= MAX_TRACKS,
)

function isSelected(channel: number): boolean {
  return selected.value.includes(channel)
}

function toggleChannel(channel: number) {
  if (isSelected(channel)) {
    selected.value = selected.value.filter((value) => value !== channel)
    return
  }
  if (selected.value.length >= MAX_TRACKS) return
  selected.value = [...selected.value, channel]
}

function useBusiest() {
  selected.value = channelPickerCandidates.value
    .slice(0, MAX_TRACKS)
    .map((candidate) => candidate.channel)
}

function cancel() {
  finishChannelPickerDialog(null)
}

function confirm() {
  if (!canConfirm.value) return
  finishChannelPickerDialog([...selected.value])
}

function onClose() {
  finishChannelPickerDialog(null)
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="channel-picker"
    aria-labelledby="channel-picker-title"
    @close="onClose"
    @click.self="cancel"
  >
    <form class="channel-picker__panel" @submit.prevent="confirm">
      <header class="channel-picker__header">
        <h2 id="channel-picker-title" class="channel-picker__title">Choose 8 MIDI channels</h2>
        <p class="channel-picker__subtitle">
          {{ channelPickerFilename }} has {{ channelPickerCandidates.length }} note channels.
          Pick up to {{ MAX_TRACKS }} for Tracker tracks.
        </p>
      </header>

      <div class="channel-picker__toolbar">
        <button type="button" class="tracker-btn" @click="useBusiest">
          Use busiest {{ MAX_TRACKS }}
        </button>
        <span class="channel-picker__count">{{ selectionCount }}/{{ MAX_TRACKS }} selected</span>
      </div>

      <ul class="channel-picker__list">
        <li v-for="candidate in channelPickerCandidates" :key="candidate.channel">
          <label class="channel-picker__item">
            <input
              type="checkbox"
              :checked="isSelected(candidate.channel)"
              :disabled="!isSelected(candidate.channel) && selectionCount >= MAX_TRACKS"
              @change="toggleChannel(candidate.channel)"
            />
            <span class="channel-picker__label">{{ candidate.label }}</span>
            <span class="channel-picker__notes">{{ candidate.noteCount.toLocaleString() }} notes</span>
          </label>
        </li>
      </ul>

      <div class="channel-picker__actions">
        <button type="button" class="tracker-btn" @click="cancel">Cancel</button>
        <button type="submit" class="tracker-btn tracker-btn--accent" :disabled="!canConfirm">
          Import selection
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.channel-picker {
  max-width: 34rem;
  width: calc(100% - 2rem);
  padding: 0;
  border: 1px solid var(--border-light);
  background: var(--bg-panel);
  color: var(--text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.channel-picker::backdrop {
  background: rgba(8, 8, 14, 0.72);
}

.channel-picker__panel {
  margin: 0;
  padding: 0.75rem;
}

.channel-picker__title {
  margin: 0;
  color: var(--accent-warm);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.channel-picker__subtitle {
  margin: 0.35rem 0 0;
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.45;
}

.channel-picker__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0.65rem 0 0.45rem;
}

.channel-picker__count {
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.channel-picker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: min(22rem, 50vh);
  overflow: auto;
  border: 1px solid var(--border);
}

.channel-picker__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.45rem;
  align-items: center;
  padding: 0.35rem 0.45rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.channel-picker__item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.channel-picker__label {
  color: var(--text-bright);
  font-size: 10px;
}

.channel-picker__notes {
  color: var(--text-dim);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.channel-picker__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 0.65rem;
}
</style>
