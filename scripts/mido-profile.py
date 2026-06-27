#!/usr/bin/env python3
"""Optional third-party MIDI profile via mido (pip install mido)."""
from __future__ import annotations

import json
import sys

try:
    import mido
except ImportError:
    print(json.dumps({"error": "mido not installed"}))
    sys.exit(2)


def profile(path: str) -> dict:
    mid = mido.MidiFile(path)
    note_on = 0
    channels: set[int] = set()
    programs = 0
    controllers = 0
    tempos: list[float] = []

    for track in mid.tracks:
        for msg in track:
            if msg.type == "note_on" and msg.velocity > 0:
                note_on += 1
                channels.add(msg.channel)
            elif msg.type == "program_change":
                programs += 1
            elif msg.type == "control_change":
                controllers += 1
            elif msg.type == "set_tempo":
                tempos.append(round(mido.tempo2bpm(msg.tempo), 2))

    return {
        "type": mid.type,
        "tracks": len(mid.tracks),
        "ticks_per_beat": mid.ticks_per_beat,
        "length_seconds": mid.length,
        "note_on_count": note_on,
        "channels": sorted(channels),
        "program_changes": programs,
        "controller_events": controllers,
        "tempo_changes": len(tempos),
        "tempos_bpm": tempos[:8],
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage: mido-profile.py <file.mid>"}))
        sys.exit(1)
    print(json.dumps(profile(sys.argv[1]), indent=2))
