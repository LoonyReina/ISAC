#!/usr/bin/env python3
"""Verify raw binary parts and reconstruct an exact frozen 802.11ad archive.

Usage: python reassemble-80211ad-evidence.py MANIFEST.parts.json [OUTPUT_DIRECTORY]

Download every listed part alongside its manifest. Paths are resolved from the
manifest, not the working directory. The output directory must already exist.
Uses only the Python standard library, with no network or recompression. Every
part and the reconstructed ZIP are SHA-256 checked. Existing files are never
overwritten; an identical archive is verified and reused. Optional download only.
"""

from pathlib import Path
import hashlib
import json
import os
import re
import sys
import tempfile


def insist(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def positive_integer(value):
    return type(value) is int and value > 0


def safe_filename(value):
    return (isinstance(value, str) and value not in ("", ".", "..")
            and not any(character in value for character in "/\\:\x00")
            and Path(value).name == value)


def sha256_string(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None


def main(arguments):
    if len(arguments) not in (1, 2):
        raise ValueError(__doc__)
    manifest = Path(arguments[0]).resolve()
    metadata = json.loads(manifest.read_text(encoding="utf-8"))
    base = manifest.parent
    insist(type(metadata.get("schemaVersion")) is int
           and metadata["schemaVersion"] == 1, "Unsupported manifest schema")
    archive_file = metadata["archiveFile"]
    insist(safe_filename(archive_file) and archive_file.endswith(".zip"),
           "Invalid archive filename")
    insist(positive_integer(metadata["archiveBytes"]), "Invalid archive byte count")
    insist(sha256_string(metadata["archiveSha256"]), "Invalid archive SHA-256")
    parts = metadata["parts"]
    insist(isinstance(parts, list) and parts, "Missing parts")
    seen = set()
    for order, part in enumerate(parts, 1):
        filename = part["file"]
        insist(type(part["order"]) is int and part["order"] == order
               and safe_filename(filename) and filename not in seen
               and filename == f"{archive_file}.part{order:02d}",
               "Invalid or duplicate part ordering/name")
        seen.add(filename)
        insist(positive_integer(part["bytes"]) and part["bytes"] <= 9_000_000,
               "Invalid part size or transfer envelope exceeded")
        insist(sha256_string(part["sha256"]), "Invalid part SHA-256")
        path = base / filename
        insist(path.is_file() and not path.is_symlink(),
               "Part must be a regular local file: " + filename)
        insist(path.stat().st_size == part["bytes"] and digest(path) == part["sha256"],
               "Part verification failed: " + filename)
    insist(sum(part["bytes"] for part in parts) == metadata["archiveBytes"],
           "Archive byte sum mismatch")
    destination = Path(arguments[1]).resolve() if len(arguments) == 2 else base
    insist(destination.is_dir(), "Output directory must already exist")
    output = destination / archive_file
    insist(not output.is_symlink(), "Existing archive is a symlink; never overwritten")
    if output.exists():
        insist(output.is_file() and output.stat().st_size == metadata["archiveBytes"]
               and digest(output) == metadata["archiveSha256"],
               "Existing archive differs; never overwritten")
        print("Already reconstructed and SHA256 verified:", output)
        return
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=archive_file + ".assembling-", dir=destination)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as target:
            for part in parts:
                with (base / part["file"]).open("rb") as source:
                    for chunk in iter(lambda: source.read(1024 * 1024), b""):
                        target.write(chunk)
        insist(temporary.stat().st_size == metadata["archiveBytes"]
               and digest(temporary) == metadata["archiveSha256"],
               "Reconstructed hash mismatch")
        # Atomic creation fails rather than overwriting a concurrent writer.
        os.link(temporary, output)
        print("Reconstructed and SHA256 verified:", output)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise SystemExit("Error: " + str(error)) from None
