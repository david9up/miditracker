# Changelog

All notable changes to MidiTracker are documented here.

## [1.0.1] — 2026-06-27

### Fixed

- Channel list and transport bar now show full instrument and pattern names instead of hard 14-character truncation
- Pattern title in the header has more room before CSS ellipsis kicks in

### Changed

- GitHub Pages deploy is manual only (`workflow_dispatch`) — no automatic deploy on push to `main`

[1.0.1]: https://github.com/david9up/miditracker/releases/tag/v1.0.1

## [1.0.0] — 2026-06-28

First public release.

### Added

- Standard MIDI import → Polyend Tracker+ patterns (`@polyend/tracker-lib`)
- 8-track channel mapping, tempo map with pattern splits, CC/program FX mapping
- Pattern grid editing (keyboard entry, undo/redo, song order, BPM, pattern length)
- GM SoundFont in-browser preview (FluidR3_GM)
- Export Tracker+ project ZIP, individual `.mtp` files, MIDI reference, and source MIDI
- Export validation — tracker-lib round-trip before download
- Built-in sample song and blank-grid onboarding
- Session drawer: Song · Import · Export · Tempo
- Playwright README screenshot pipeline (`npm run screenshots`)
- GitHub Actions CI and GitHub Pages deploy

### Notes

- Community tool — not affiliated with or endorsed by Polyend.
- Hardware export remains authoritative; GM preview does not audition CC events.

[1.0.0]: https://github.com/david9up/miditracker/releases/tag/v1.0.0
