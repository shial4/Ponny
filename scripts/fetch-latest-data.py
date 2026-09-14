#!/usr/bin/env python3
"""
Build a fresh static data snapshot for Pony.

No Riot API key is used or embedded. Static League data comes from:
1) Riot Data Dragon (official canonical assets/static data)
2) CommunityDragon's `latest` client-data mirror (freshness supplement)

The browser still performs a live version check, so the deployed snapshot is
a fallback and reproducibility layer rather than a hard pin.
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import shutil
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RIOT = DATA / "riot"
COMMUNITY = DATA / "community"

RIOT.mkdir(parents=True, exist_ok=True)
COMMUNITY.mkdir(parents=True, exist_ok=True)

UA = "Pony-League-OTP-Optimiser/1.0 (+GitHub Pages static data refresh)"


def fetch_bytes(url: str, timeout: int = 35) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json,text/plain,*/*",
            "Cache-Control": "no-cache",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_json(url: str):
    return json.loads(fetch_bytes(url).decode("utf-8"))


def write_json(path: pathlib.Path, value) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    tmp.replace(path)


def safe_fetch_json(url: str, output: pathlib.Path, errors: list[dict]) -> bool:
    try:
        value = fetch_json(url)
        write_json(output, value)
        return True
    except Exception as exc:  # preserve previous snapshot if one exists
        errors.append({"url": url, "error": repr(exc)})
        return False


def main() -> int:
    fetched_at = dt.datetime.now(dt.timezone.utc).isoformat()
    errors: list[dict] = []

    versions_url = "https://ddragon.leagueoflegends.com/api/versions.json"
    versions = None
    ddragon_version = None

    try:
        versions = fetch_json(versions_url)
        if isinstance(versions, list) and versions:
            ddragon_version = str(versions[0])
            write_json(RIOT / "versions.json", versions)
    except Exception as exc:
        errors.append({"url": versions_url, "error": repr(exc)})
        # Reuse prior manifest/version when a scheduled refresh has a transient failure.
        manifest_path = DATA / "manifest.json"
        if manifest_path.exists():
            try:
                old = json.loads(manifest_path.read_text(encoding="utf-8"))
                ddragon_version = old.get("riot", {}).get("ddragon_version")
            except Exception:
                pass

    riot_files = {}
    if ddragon_version:
        base = f"https://ddragon.leagueoflegends.com/cdn/{ddragon_version}/data/en_US"
        targets = {
            "champion": f"{base}/champion.json",
            "item": f"{base}/item.json",
            "runesReforged": f"{base}/runesReforged.json",
            "summoner": f"{base}/summoner.json",
        }
        for name, url in targets.items():
            output = RIOT / f"{name}.json"
            ok = safe_fetch_json(url, output, errors)
            riot_files[name] = {"url": url, "ok": ok, "path": f"data/riot/{output.name}"}

    # CommunityDragon tracks the current client data more aggressively than Data Dragon.
    cbase = (
        "https://raw.communitydragon.org/latest/plugins/"
        "rcp-be-lol-game-data/global/default/v1"
    )
    community_targets = {
        "champion-summary": f"{cbase}/champion-summary.json",
        "items": f"{cbase}/items.json",
        "perks": f"{cbase}/perks.json",
        "perkstyles": f"{cbase}/perkstyles.json",
        "champion-rune-recommendations": f"{cbase}/champion-rune-recommendations.json",
        "championperkstylemap": f"{cbase}/championperkstylemap.json",
    }
    community_files = {}
    for name, url in community_targets.items():
        output = COMMUNITY / f"{name}.json"
        ok = safe_fetch_json(url, output, errors)
        community_files[name] = {
            "url": url,
            "ok": ok,
            "path": f"data/community/{output.name}",
        }

    manifest = {
        "schema_version": 2,
        "generated": True,
        "fetched_at": fetched_at,
        "riot": {
            "ddragon_version": ddragon_version,
            "versions_url": versions_url,
            "files": riot_files,
            "warning": (
                "Riot documents that Data Dragon is manually updated and can lag a live patch. "
                "Pony therefore also snapshots CommunityDragon latest client data and performs "
                "a live browser version check."
            ),
        },
        "communitydragon": {
            "channel": "latest",
            "base_url": cbase,
            "files": community_files,
        },
        "errors": errors,
    }
    write_json(DATA / "manifest.json", manifest)

    # A deployment should only fail if we have no usable Riot static snapshot at all.
    required = [RIOT / "champion.json", RIOT / "item.json", RIOT / "runesReforged.json"]
    missing = [str(p) for p in required if not p.exists()]
    if missing:
        print("Missing required Riot snapshot files:", *missing, sep="\n- ", file=sys.stderr)
        return 1

    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
