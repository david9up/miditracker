#!/usr/bin/env python3
"""Copy validated game MIDI files into fixtures/game-corpus."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    __import__("os").environ.get(
        "MIDITRACKER_GAME_MIDI_SOURCE",
        "~/Music/Roland MIDI/game midi files",
    )
).expanduser()
DEST = ROOT / "fixtures" / "game-corpus"
VALIDATE = ["node", str(ROOT / "scripts" / "validate-midi.mjs")]


def main() -> int:
    if not SOURCE.is_dir():
        print(f"Missing source directory: {SOURCE}", file=sys.stderr)
        return 1

    DEST.mkdir(parents=True, exist_ok=True)
    for path in DEST.iterdir():
        if path.is_file() and path.suffix == ".mid":
            path.unlink()

    manifest_files: list[dict[str, str]] = []
    sources = sorted(SOURCE.glob("*.mid"))

    for index, source in enumerate(sources, 1):
        result = subprocess.run(VALIDATE + [str(source)], cwd=ROOT, capture_output=True)
        if result.returncode != 0:
            continue

        dest_name = f"{index:02d}-{source.stem}.mid"
        shutil.copy2(source, DEST / dest_name)
        manifest_files.append({"file": dest_name, "source": source.name})

    manifest = {
        "source": "game midi files",
        "count": len(manifest_files),
        "files": manifest_files,
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Copied {len(manifest_files)} of {len(sources)} game MIDI files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
