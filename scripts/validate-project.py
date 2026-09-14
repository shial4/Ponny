#!/usr/bin/env python3
from pathlib import Path
import json
import re
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
errors = []

required = [
    "index.html",
    "404.html",
    "site.webmanifest",
    ".nojekyll",
    "assets/pony.svg",
    "data/manifest.json",
    ".github/workflows/validate.yml",
    "tests/model.test.js",
    "tests/static.test.py",
]

for rel in required:
    p = root / rel
    if not p.exists():
        errors.append(f"missing {rel}")
    else:
        print(f"OK {rel}")

# We publish via branch, not actions/deploy-pages.
for bad in (
    ".github/workflows/pages.yml",
    ".github/workflows/pages.yaml",
    ".github/workflows/deploy.yml",
    ".github/workflows/deploy.yaml",
):
    if (root / bad).exists():
        errors.append(f"remove custom Pages workflow: {bad}")

html = (root / "index.html").read_text(encoding="utf-8")

markers = [
    'Ranked Solo/Duo · 420',
    'RANKED_SOLO_QUEUE_ID=420',
    'loaderOverlay',
    'Who do you OTP?',
    'championGrid',
    'championSearch',
    'Change champion',
    'currentCompletedItems',
    'isCurrentCompletedStoreItem',
    'Try again',
    'renderChampionPicker',
    'Analysing ${state.selected.name}',
    'Rabadon',
    'Shadowflame',
    'Stormsurge',
    'api/versions.json',
    'raw.communitydragon.org/latest',
    'runSmokeSuite',
    'currentPrior()',
    'Dusk and Dawn',
    'SOLOQ_PRIORS',
    'id="reasonPanel"',
    'id="rankTabs"',
    'id="goalChoices"',
    'id="roleChoices"',
]
for marker in markers:
    if marker not in html:
        errors.append(f"index.html missing marker: {marker}")

manifest = json.loads((root / "data/manifest.json").read_text(encoding="utf-8"))
if manifest.get("queue_policy", {}).get("queue_id") != 420:
    errors.append("queue policy is not queueId 420")

scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
if scripts:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tmp:
        tmp.write("\n".join(scripts))
        js_path = tmp.name
    try:
        result = subprocess.run(["node", "--check", js_path], capture_output=True, text=True)
        if result.returncode != 0:
            errors.append("JavaScript syntax check failed:\n" + result.stderr)
        else:
            print("OK JavaScript syntax")
    except FileNotFoundError:
        print("WARN node not available; skipped JS syntax check")

if errors:
    print("\nVALIDATION FAILED")
    for error in errors:
        print("-", error)
    raise SystemExit(1)

print("\nPony validation passed.")
