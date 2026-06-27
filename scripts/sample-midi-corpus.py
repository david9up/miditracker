#!/usr/bin/env python3
"""Sample random MIDI files into fixtures/midi-corpus for regression tests."""
from __future__ import annotations

import json
import random
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS_DIR = ROOT / "fixtures" / "midi-corpus"
SOURCE_ROOT = Path(
    __import__("os").environ.get("MIDITRACKER_MIDI_SOURCE", "~/Music/Roland MIDI")
).expanduser()
VALIDATE_SCRIPT = ROOT / "scripts" / "validate-midi.mjs"
DEFAULT_SEED = 123
DEFAULT_COUNT = 123
KEEP_FILES = {"00-pilot-doom-e1m1.mid", "13-ff7_105.mid"}


def sanitize_stem(stem: str) -> str:
    cleaned = re.sub(r"[^\w.-]+", "_", stem, flags=re.UNICODE).strip("._")
    return cleaned[:80] or "untitled"


def list_sources() -> list[Path]:
    output = subprocess.check_output(
        ["find", str(SOURCE_ROOT), "-iname", "*.mid"],
        text=True,
    )
    return sorted(Path(line) for line in output.strip().split("\n") if line)


def is_supported_midi(path: Path) -> bool:
    result = subprocess.run(
        ["node", str(VALIDATE_SCRIPT), str(path)],
        cwd=ROOT,
        capture_output=True,
    )
    return result.returncode == 0


def main() -> int:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_COUNT
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_SEED

    sources = list_sources()
    rng = random.Random(seed)
    rng.shuffle(sources)

    picked: list[Path] = []
    skipped = 0
    for source in sources:
        if len(picked) >= count:
            break
        if is_supported_midi(source):
            picked.append(source)
        else:
            skipped += 1

    if len(picked) < count:
        print(
            f"Only found {len(picked)} supported MIDI files, need {count} "
            f"(skipped {skipped} unsupported)",
            file=sys.stderr,
        )
        return 1

    CORPUS_DIR.mkdir(parents=True, exist_ok=True)

    for path in CORPUS_DIR.iterdir():
        if path.is_file() and path.name.endswith(".mid") and path.name not in KEEP_FILES:
            path.unlink()

    manifest_files: list[dict[str, str]] = []
    for index, source in enumerate(picked, 1):
        dest_name = f"{index:03d}-{sanitize_stem(source.stem)}.mid"
        dest = CORPUS_DIR / dest_name
        shutil.copy2(source, dest)
        manifest_files.append(
            {
                "file": dest_name,
                "source": str(source.relative_to(SOURCE_ROOT)),
            }
        )

    manifest = {
        "seed": seed,
        "count": count,
        "skippedUnsupported": skipped,
        "files": manifest_files,
    }
    (CORPUS_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Copied {count} supported files to {CORPUS_DIR} (seed={seed}, skipped={skipped})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

