<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  confirmDialogCancelLabel,
  confirmDialogConfirmLabel,
  confirmDialogMessage,
  confirmDialogTitle,
  confirmDialogVisible,
  finishConfirmDialog,
} from '@/lib/confirm-dialog-state'

const dialogRef = ref<HTMLDialogElement | null>(null)

watch(confirmDialogVisible, (visible) => {
  const dialog = dialogRef.value
  if (!dialog) return
  if (visible && !dialog.open) {
    dialog.showModal()
  } else if (!visible && dialog.open) {
    dialog.close()
  }
})

function onClose() {
  finishConfirmDialog(false)
}

function confirm() {
  finishConfirmDialog(true)
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="confirm-dialog"
    aria-labelledby="confirm-dialog-title"
    @close="onClose"
    @click.self="onClose"
  >
    <form class="confirm-dialog__panel" @submit.prevent="confirm">
      <h2 id="confirm-dialog-title" class="confirm-dialog__title">{{ confirmDialogTitle }}</h2>
      <p class="confirm-dialog__message">{{ confirmDialogMessage }}</p>
      <div class="confirm-dialog__actions">
        <button type="button" class="tracker-btn" @click="onClose">
          {{ confirmDialogCancelLabel }}
        </button>
        <button type="submit" class="tracker-btn tracker-btn--accent">
          {{ confirmDialogConfirmLabel }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  max-width: 26rem;
  width: calc(100% - 2rem);
  padding: 0;
  border: 1px solid var(--border-light);
  background: var(--bg-panel);
  color: var(--text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.confirm-dialog::backdrop {
  background: rgba(8, 8, 14, 0.72);
}

.confirm-dialog__panel {
  margin: 0;
  padding: 0.75rem;
}

.confirm-dialog__title {
  margin: 0 0 0.45rem;
  color: var(--accent-warm);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.confirm-dialog__message {
  margin: 0 0 0.75rem;
  color: var(--text);
  font-size: 11px;
  line-height: 1.5;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}
</style>
