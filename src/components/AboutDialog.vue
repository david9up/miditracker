<script setup lang="ts">
import { ref, watch } from 'vue'
import { APP_AUTHOR, APP_BUILD_DATE, APP_VERSION } from '@/app-version'

const open = defineModel<boolean>({ default: false })

const dialogRef = ref<HTMLDialogElement | null>(null)

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
    class="about-dialog"
    aria-labelledby="about-dialog-title"
    @close="onClose"
    @click.self="onClose"
  >
    <form method="dialog" class="about-dialog__panel" @submit.prevent="onClose">
      <section class="about-dialog__hero" aria-label="About MidiTracker">
        <img class="about-dialog__logo" src="/logo-mark.svg?v=din3" width="56" height="56" alt="" />
        <div class="about-dialog__identity">
          <div class="about-dialog__title-row">
            <h2 id="about-dialog-title" class="about-dialog__title">MidiTracker</h2>
            <span class="about-dialog__version">v{{ APP_VERSION }}</span>
          </div>
          <p class="about-dialog__motto">the grid's not dead</p>
        </div>
      </section>

      <section class="about-dialog__body">
        <p class="about-dialog__copy">
          Converts Standard MIDI files into Polyend Tracker+ patterns. Import, preview, edit, and
          export project ZIPs or individual .mtp files.
        </p>

        <div class="about-dialog__metrics">
          <div class="about-dialog__metric">
            <span class="about-dialog__metric-label">Author</span>
            <span class="about-dialog__metric-value">{{ APP_AUTHOR }}</span>
          </div>
          <div class="about-dialog__metric">
            <span class="about-dialog__metric-label">Built</span>
            <span class="about-dialog__metric-value">{{ APP_BUILD_DATE }}</span>
          </div>
        </div>
      </section>

      <footer class="about-dialog__footer">
        <p class="about-dialog__disclaimer">
          Community tool — not affiliated with or endorsed by Polyend.
        </p>
        <button type="submit" class="tracker-btn about-dialog__close">Close</button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.about-dialog {
  max-width: 22rem;
  width: calc(100% - 2rem);
  padding: 0;
  border: 1px solid var(--border-light);
  background: var(--bg-panel);
  color: var(--text);
  box-shadow:
    0 0 0 1px rgba(110, 200, 255, 0.08),
    0 16px 48px rgba(0, 0, 0, 0.6);
}

.about-dialog::backdrop {
  background: rgba(8, 8, 14, 0.78);
}

.about-dialog__panel {
  margin: 0;
  overflow: hidden;
}

.about-dialog__hero {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1rem 0.85rem;
  background: linear-gradient(180deg, #151522 0%, #101018 100%);
  border-bottom: 1px solid var(--border);
}

.about-dialog__logo {
  flex-shrink: 0;
  display: block;
  filter: drop-shadow(0 0 10px rgba(110, 200, 255, 0.35));
}

.about-dialog__identity {
  min-width: 0;
}

.about-dialog__title-row {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}

.about-dialog__title {
  margin: 0;
  color: var(--brand-blue);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.1;
}

.about-dialog__version {
  color: var(--version-color);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 0 10px rgba(240, 160, 64, 0.35);
}

.about-dialog__motto {
  margin: 0.2rem 0 0;
  color: var(--text-dim);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: lowercase;
}

.about-dialog__body {
  padding: 0.85rem 1rem;
}

.about-dialog__copy {
  margin: 0;
  color: var(--text);
  font-size: 10px;
  line-height: 1.55;
}

.about-dialog__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.about-dialog__metric {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  padding: 0.35rem 0.4rem;
  border: 1px solid var(--border);
  background: var(--bg-cell);
}

.about-dialog__metric-label {
  color: var(--text-dim);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.about-dialog__metric-value {
  color: var(--text-bright);
  font-size: 10px;
  line-height: 1.3;
}

.about-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 1rem 0.65rem;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.18);
}

.about-dialog__disclaimer {
  margin: 0;
  color: var(--text-dim);
  font-size: 8px;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

.about-dialog__close {
  flex-shrink: 0;
}
</style>
