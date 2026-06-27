<script setup lang="ts">
import { ref, watch } from 'vue'

const open = defineModel<boolean>({ default: false })

const dialogRef = ref<HTMLDialogElement | null>(null)

const sections = [
  {
    title: 'Notes',
    rows: [
      ['Z–M, ,', 'Enter notes (note column) · moves down one row'],
      ['.', 'Lower base octave'],
      ['/', 'Raise base octave'],
      ['?', 'Open this help panel'],
    ],
  },
  {
    title: 'Grid',
    rows: [
      ['← →', 'Move between columns'],
      ['Shift ← →', 'Change track'],
      ['↑ ↓', 'Move row · PgUp/PgDn jump 16 rows'],
      ['Tab / Shift+Tab', 'Next / previous column (incl. FX type → value)'],
      ['0–9, A–F', 'Hex digits for instrument & FX'],
      ['0–9', 'Decimal volume (000–100)'],
      ['Backspace / Delete', 'Clear column · Shift clears whole step'],
    ],
  },
  {
    title: 'Transport',
    rows: [
      ['Space', 'Play / pause from cursor row'],
      ['Stop', 'Stop at current row (does not rewind)'],
      ['Top', 'Return to song start'],
      ['⌘Z / ⌘⇧Z', 'Undo / redo'],
    ],
  },
]

watch(open, (visible) => {
  const dialog = dialogRef.value
  if (!dialog) return
  if (visible && !dialog.open) {
    dialog.showModal()
  } else if (!visible && dialog.open) {
    dialog.close()
  }
})

function onClose() {
  open.value = false
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="keyboard-help"
    aria-labelledby="keyboard-help-title"
    @close="onClose"
    @click.self="onClose"
  >
    <form method="dialog" class="keyboard-help__panel" @submit.prevent="onClose">
      <header class="keyboard-help__header">
        <h2 id="keyboard-help-title" class="keyboard-help__title">Keyboard shortcuts</h2>
        <button type="submit" class="tracker-btn keyboard-help__close" aria-label="Close">
          Close
        </button>
      </header>

      <div class="keyboard-help__body">
        <section v-for="section in sections" :key="section.title" class="keyboard-help__section">
          <h3 class="keyboard-help__section-title">{{ section.title }}</h3>
          <dl class="keyboard-help__list">
            <template v-for="([key, desc], index) in section.rows" :key="index">
              <dt>{{ key }}</dt>
              <dd>{{ desc }}</dd>
            </template>
          </dl>
        </section>

        <p class="keyboard-help__note">
          Preview follows tempo map and program-change FX. CC controllers are not auditioned — export matches Tracker+.
        </p>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.keyboard-help {
  max-width: 34rem;
  width: calc(100% - 2rem);
  padding: 0;
  border: 1px solid var(--border-light);
  background: var(--bg-panel);
  color: var(--text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.keyboard-help::backdrop {
  background: rgba(8, 8, 14, 0.72);
}

.keyboard-help__panel {
  margin: 0;
}

.keyboard-help__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-head);
}

.keyboard-help__title {
  margin: 0;
  color: var(--accent-warm);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.keyboard-help__body {
  padding: 0.65rem;
  max-height: min(28rem, 70vh);
  overflow: auto;
}

.keyboard-help__section + .keyboard-help__section {
  margin-top: 0.75rem;
}

.keyboard-help__section-title {
  margin: 0 0 0.35rem;
  color: var(--text-dim);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.keyboard-help__list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.65rem;
  margin: 0;
}

.keyboard-help__list dt {
  margin: 0;
  padding: 0.15rem 0.35rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
  color: var(--accent);
  font-size: 10px;
  font-family: var(--font-mono);
  white-space: nowrap;
}

.keyboard-help__list dd {
  margin: 0;
  align-self: center;
  color: var(--text);
  font-size: 10px;
  line-height: 1.4;
}

.keyboard-help__note {
  margin: 0.85rem 0 0;
  padding: 0.4rem 0.45rem;
  border: 1px solid rgba(255, 204, 102, 0.25);
  background: rgba(255, 204, 102, 0.06);
  color: var(--text-dim);
  font-size: 9px;
  line-height: 1.45;
}
</style>
