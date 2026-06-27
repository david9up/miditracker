<script setup lang="ts">
/**
 * Top menu — deck groups: Open → Edit → Tracker+ save → MIDI save → Help.
 */
defineProps<{
  loading: boolean
  canExport: boolean
  canUndo: boolean
  canRedo: boolean
  hasSourceMidi?: boolean
}>()

const emit = defineEmits<{
  load: []
  loadSample: []
  new: []
  undo: []
  redo: []
  exportProject: []
  exportPatterns: []
  exportMidiReference: []
  exportSourceMidi: []
  help: []
  about: []
}>()
</script>

<template>
  <nav class="menu-bar" aria-label="Main menu">
    <div class="menu-bar__deck" aria-label="Open">
      <span class="menu-bar__deck-label">Open</span>
      <div class="tracker-btn-group">
        <button
          type="button"
          class="tracker-btn tracker-btn--accent"
          :disabled="loading"
          title="Import a .mid or .midi file"
          @click="emit('load')"
        >
          Load MIDI
        </button>
        <button
          type="button"
          class="tracker-btn tracker-btn--warm"
          :disabled="loading"
          title="Load built-in C major demo pattern"
          @click="emit('loadSample')"
        >
          Sample
        </button>
        <button
          type="button"
          class="tracker-btn"
          :disabled="loading"
          title="New blank song"
          @click="emit('new')"
        >
          New
        </button>
      </div>
    </div>

    <div class="menu-bar__deck" aria-label="Edit">
      <span class="menu-bar__deck-label">Edit</span>
      <div class="tracker-btn-group">
        <button
          type="button"
          class="tracker-btn tracker-btn--compact"
          :disabled="loading || !canUndo"
          title="Undo (⌘Z)"
          @click="emit('undo')"
        >
          Undo
        </button>
        <button
          type="button"
          class="tracker-btn tracker-btn--compact"
          :disabled="loading || !canRedo"
          title="Redo (⌘⇧Z)"
          @click="emit('redo')"
        >
          Redo
        </button>
      </div>
    </div>

    <div class="menu-bar__deck" aria-label="Save to Tracker+">
      <span class="menu-bar__deck-label">Tracker+</span>
      <div class="tracker-btn-group">
        <button
          type="button"
          class="tracker-btn tracker-btn--compact"
          :disabled="!canExport || loading"
          title="Save full Tracker+ project ZIP"
          @click="emit('exportProject')"
        >
          Project ZIP
        </button>
        <button
          type="button"
          class="tracker-btn tracker-btn--compact"
          :disabled="!canExport || loading"
          title="Save all patterns as .mtp files"
          @click="emit('exportPatterns')"
        >
          Patterns
        </button>
      </div>
    </div>

    <div class="menu-bar__deck" aria-label="Save MIDI reference">
      <span class="menu-bar__deck-label">MIDI</span>
      <div class="tracker-btn-group">
        <button
          type="button"
          class="tracker-btn tracker-btn--compact"
          :disabled="!canExport || loading"
          title="Save grid as Standard MIDI for hardware A/B"
          @click="emit('exportMidiReference')"
        >
          Reference
        </button>
        <button
          type="button"
          class="tracker-btn tracker-btn--compact"
          :disabled="!hasSourceMidi || loading"
          title="Save the original imported .mid unchanged"
          @click="emit('exportSourceMidi')"
        >
          Source
        </button>
      </div>
    </div>

    <div class="menu-bar__tail">
      <div class="menu-bar__deck menu-bar__deck--inline" aria-label="Help">
        <div class="tracker-btn-group">
          <button
            type="button"
            class="tracker-btn tracker-btn--ghost tracker-btn--compact"
            :disabled="loading"
            title="Keyboard shortcuts (?)"
            @click="emit('help')"
          >
            ?
          </button>
          <button
            type="button"
            class="tracker-btn tracker-btn--ghost tracker-btn--compact"
            :disabled="loading"
            title="About MidiTracker"
            @click="emit('about')"
          >
            About
          </button>
        </div>
      </div>
      <p class="menu-bar__hint">Tracker+ · 49–64 · 4 rows/beat</p>
    </div>
  </nav>
</template>

<style scoped>
.menu-bar {
  display: flex;
  align-items: flex-end;
  gap: 0.85rem;
  padding: 0.35rem 0.75rem 0.4rem;
  background: linear-gradient(180deg, #14141f 0%, var(--bg-head) 100%);
  border-bottom: 1px solid var(--border);
}

.menu-bar__deck {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  flex-shrink: 0;
}

.menu-bar__deck--inline {
  gap: 0;
}

.menu-bar__deck-label {
  padding-left: 0.15rem;
  color: var(--text-dim);
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}

.menu-bar__tail {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
  margin-left: auto;
  flex-shrink: 0;
}

.menu-bar__hint {
  margin: 0 0 0.15rem;
  color: var(--text-dim);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .menu-bar__hint {
    display: none;
  }
}

@media (max-width: 820px) {
  .menu-bar {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.55rem;
  }

  .menu-bar__tail {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
