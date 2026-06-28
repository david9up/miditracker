# Scripts

Developer utilities — not required to run the app.

## Maintenance

| Script | Usage |
|--------|--------|
| `validate-export.ts` | `npm run validate:export -- <path>` — validate `.mtp`, `.mt`, or export ZIP |
| `validate-midi.mjs` | `node scripts/validate-midi.mjs <file.mid>` — quick MIDI parse check |
| `sample-midi-corpus.py` | Rebuild `fixtures/midi-corpus/` from local MIDI library |
| `build-game-corpus.py` | Rebuild `fixtures/game-corpus/` from local game MIDI folder |
| `probe-game-export.ts` | `npx tsx scripts/probe-game-export.ts` — batch export validation on game corpus |
| `push-to-github.sh` | `./scripts/push-to-github.sh [branch]` — HTTPS push via gh |
| `gh-push.sh` | `./scripts/gh-push.sh <ref>` — low-level HTTPS push |
| `gh-auth-check.sh` | `./scripts/gh-auth-check.sh` — verify repo + workflow scopes |
| `deploy-pages.sh` | `./scripts/deploy-pages.sh [branch]` — trigger Pages workflow and wait |

Corpus rebuild env vars (see `fixtures/README.md`):

- `MIDITRACKER_MIDI_SOURCE` — default `~/Music/Roland MIDI`
- `MIDITRACKER_GAME_MIDI_SOURCE` — default `~/Music/Roland MIDI/game midi files`

## Debug (import / export investigation)

| Script | Usage |
|--------|--------|
| `debug-compare.ts` | `npx tsx scripts/debug-compare.ts [fixture.mid …]` |
| `debug-events.ts` | MIDI event dump for a fixture |
| `debug-failures.ts` | List corpus files that fail import parity |
| `debug-metadata.ts` | Pattern metadata inspection |
| `debug-readback.ts` | tracker-lib readback comparison |
| `mido-profile.py` | Python mido timing profile (optional) |
| `sample-midi-corpus.py` | See maintenance |
