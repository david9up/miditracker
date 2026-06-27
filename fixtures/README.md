# Test fixtures

Regression `.mid` files used by Vitest — not shipped with exports.

| Directory | Purpose |
|-----------|---------|
| `midi-corpus/` | General MIDI test files (Doom E1M1, RPG/cover rips, etc.) |
| `game-corpus/` | Game music samples for export/compare tests |
| `roland-corpus/` | Roland SC-55 style reference material |

These files are third-party MIDI content included solely for automated testing. Do not redistribute them as a standalone collection.

Manifest `source` fields use collection-relative paths (no machine-local absolute paths). To rebuild corpora locally, set:

- `MIDITRACKER_MIDI_SOURCE` — root folder for `scripts/sample-midi-corpus.py` (default: `~/Music/Roland MIDI`)
- `MIDITRACKER_GAME_MIDI_SOURCE` — folder for `scripts/build-game-corpus.py` (default: `~/Music/Roland MIDI/game midi files`)
