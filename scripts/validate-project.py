#!/usr/bin/env python3
from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[1]

required = [
    root / "index.html",
    root / "404.html",
    root / "site.webmanifest",
    root / "assets" / "pony.svg",
    root / "data" / "manifest.json",
    root / ".github" / "workflows" / "pages.yml",
]

failed = False
for path in required:
    if not path.exists() or not path.is_file():
        print(f"ERROR missing: {path.relative_to(root)}")
        failed = True
    else:
        print(f"OK: {path.relative_to(root)}")

try:
    manifest = json.loads((root / "data" / "manifest.json").read_text(encoding="utf-8"))
    print("Manifest schema:", manifest.get("schema_version"))
except Exception as exc:
    print("ERROR invalid data/manifest.json:", exc)
    failed = True

html = (root / "index.html").read_text(encoding="utf-8")
for needle in ["Pony", "api/versions.json", "raw.communitydragon.org/latest"]:
    if needle not in html:
        print(f"ERROR index.html missing expected marker: {needle}")
        failed = True

raise SystemExit(1 if failed else 0)
