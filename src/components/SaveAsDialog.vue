<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import {
  cancelSaveAsDialog,
  confirmSaveAsDialog,
  saveDialogHint,
  saveDialogSuggestedName,
  saveDialogTitle,
  saveDialogVisible,
} from '@/lib/save-dialog-state'
import { sanitizeFilename } from '@/lib/utils'

const dialogRef = ref<HTMLDialogElement | null>(null)
const filenameInput = ref<HTMLInputElement | null>(null)
const filename = ref('')

watch(saveDialogVisible, async (visible) => {
  const dialog = dialogRef.value
  if (!visible) {
    if (dialog?.open) dialog.close()
    return
  }

  filename.value = saveDialogSuggestedName.value
  if (dialog && !dialog.open) {
    dialog.showModal()
  }
  await nextTick()
  filenameInput.value?.focus()
  filenameInput.value?.select()
})

function submit() {
  const trimmed = filename.value.trim()
  if (!trimmed) return
  confirmSaveAsDialog(sanitizeFilename(trimmed, 'untitled'))
}

function onClose() {
  cancelSaveAsDialog()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    onClose()
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="save-dialog"
    aria-labelledby="save-dialog-title"
    @close="onClose"
    @click.self="onClose"
    @keydown="onKeydown"
  >
    <form class="save-dialog__panel" @submit.prevent="submit">
      <h2 id="save-dialog-title" class="save-dialog__title">{{ saveDialogTitle }}</h2>
      <p v-if="saveDialogHint" class="save-dialog__hint">{{ saveDialogHint }}</p>
      <label class="save-dialog__label">
        File name
        <input
          ref="filenameInput"
          v-model="filename"
          class="save-dialog__input"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <div class="save-dialog__actions">
        <button type="button" class="tracker-btn" @click="onClose">Cancel</button>
        <button type="submit" class="tracker-btn tracker-btn--accent">Save</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.save-dialog {
  max-width: 24rem;
  width: calc(100% - 2rem);
  padding: 0;
  border: 1px solid var(--border-light);
  background: var(--bg-panel);
  color: var(--text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.save-dialog::backdrop {
  background: rgba(8, 8, 14, 0.72);
}

.save-dialog__panel {
  margin: 0;
  padding: 0.75rem;
}

.save-dialog__title {
  margin: 0 0 0.45rem;
  color: var(--accent-warm);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.save-dialog__hint {
  margin: 0 0 0.55rem;
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.45;
}

.save-dialog__label {
  display: grid;
  gap: 0.25rem;
  color: var(--text-dim);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.save-dialog__input {
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
  color: var(--text-bright);
  font: inherit;
  font-size: 11px;
}

.save-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 0.65rem;
}
</style>
