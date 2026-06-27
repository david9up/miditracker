<script setup lang="ts">
import type { Pattern } from '@/lib/types'

defineProps<{
  patterns: Pattern[]
  songOrder: number[]
  selectedOrderIndex: number
  embedded?: boolean
}>()

const emit = defineEmits<{
  select: [orderIndex: number]
  moveUp: [orderIndex: number]
  moveDown: [orderIndex: number]
  duplicate: [orderIndex: number]
  remove: [orderIndex: number]
  append: [patternIndex: number]
}>()
</script>

<template>
  <section class="song-order panel" :class="{ 'song-order--embedded': embedded }">
    <h2 v-if="!embedded" class="panel__title">
      Song Order
      <span class="song-order__count">{{ songOrder.length }}</span>
    </h2>

    <div class="panel__body song-order__body">
      <div class="song-order__list">
        <div
          v-for="(patternIndex, orderIndex) in songOrder"
          :key="`${orderIndex}-${patternIndex}`"
          class="song-order__row"
          :class="{ 'song-order__row--active': orderIndex === selectedOrderIndex }"
        >
          <button
            type="button"
            class="song-order__select"
            @click="emit('select', orderIndex)"
          >
            <span class="song-order__pos">{{ String(orderIndex + 1).padStart(2, '0') }}</span>
            <span class="song-order__name">
              {{ patterns[patternIndex]?.name ?? 'Missing' }}
            </span>
          </button>

          <div class="song-order__actions">
            <button
              type="button"
              class="tracker-btn song-order__btn"
              :disabled="orderIndex <= 0"
              title="Move up"
              @click="emit('moveUp', orderIndex)"
            >
              ↑
            </button>
            <button
              type="button"
              class="tracker-btn song-order__btn"
              :disabled="orderIndex >= songOrder.length - 1"
              title="Move down"
              @click="emit('moveDown', orderIndex)"
            >
              ↓
            </button>
            <button
              type="button"
              class="tracker-btn song-order__btn"
              title="Duplicate slot"
              @click="emit('duplicate', orderIndex)"
            >
              +
            </button>
            <button
              type="button"
              class="tracker-btn song-order__btn"
              :disabled="songOrder.length <= 1"
              title="Remove slot"
              @click="emit('remove', orderIndex)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div v-if="patterns.length > 1" class="song-order__append">
        <label class="song-order__append-label">
          Append
          <select
            class="song-order__select-input"
            @change="(event) => {
              const value = Number((event.target as HTMLSelectElement).value)
              if (!Number.isNaN(value)) emit('append', value)
              ;(event.target as HTMLSelectElement).selectedIndex = 0
            }"
          >
            <option value="" disabled selected>pattern…</option>
            <option v-for="(pattern, index) in patterns" :key="index" :value="index">
              {{ pattern.name }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
.song-order {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.song-order--embedded {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.song-order--embedded .panel__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding-top: 0.35rem;
  overflow: hidden;
}

.song-order__count {
  float: right;
  color: var(--text-dim);
  font-weight: 400;
}

.song-order__body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 0;
}

.song-order__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: auto;
  min-height: 0;
}

.song-order__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.25rem;
  align-items: center;
}

.song-order__row--active .song-order__select {
  border-color: var(--accent);
  background: #2a3050;
  color: var(--text-bright);
}

.song-order__select {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.35rem;
  align-items: center;
  width: 100%;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
  color: var(--text);
  text-align: left;
}

.song-order__select:hover {
  border-color: var(--border-light);
}

.song-order__pos {
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.song-order__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-order__actions {
  display: flex;
  gap: 0.15rem;
}

.song-order__btn {
  min-width: 1.35rem;
  padding: 0.1rem 0.2rem;
}

.song-order__append {
  padding-top: 0.15rem;
  border-top: 1px solid var(--border);
}

.song-order__append-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.song-order__select-input {
  flex: 1;
  min-width: 0;
  padding: 0.15rem 0.25rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
  color: var(--text);
}
</style>
