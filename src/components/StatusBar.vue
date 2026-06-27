<script setup lang="ts">
defineProps<{
  message: string
  tone: 'info' | 'success' | 'warn' | 'error'
}>()
</script>

<template>
  <footer class="status-bar" aria-live="polite">
    <span class="status-bar__message" :class="`status-bar__message--${tone}`">
      {{ message }}
    </span>

    <span class="status-bar__hint">MidiTracker · community tool</span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.2rem 0.65rem;
  background: var(--bg-head);
  border-top: 1px solid var(--border);
}

.status-bar__message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-dim);
  font-size: 10px;
}

.status-bar__message--success {
  color: var(--success);
}

.status-bar__message--warn {
  color: var(--warning);
}

.status-bar__message--error {
  color: var(--danger);
}

.status-bar__hint {
  flex-shrink: 0;
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
