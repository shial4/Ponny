# Pony


## Product-quality recommendation model

Pony now separates **Ranked best** from laboratory damage modes.

For champion/role combinations with a current-patch Ranked Solo baseline, the default recommendation blends:

- current SoloQ build/rune evidence;
- 1-item, 2-item and 3-item simulation;
- rune/champion fit;
- realistic build-order quality;
- proc/front-loaded damage.

Alternative objectives such as **Max burst** and **Quick trade** deliberately allow a different mathematical path.

For Ekko Jungle on the current 16.18 static-data family, the Ranked Solo baseline is anchored to:

```text
Dark Harvest + Inspiration
Dusk and Dawn → Shadowflame → Rabadon's Deathcap
```

The advanced simulator can still expose Lich/Stormsurge-style alternatives for burst or quick-trade optimisation.

### UI / UX

The analysis screen now uses custom controls instead of native selects for the main decisions:

- role;
- optimisation objective;
- result ranking.

The queue is displayed as a locked Ranked Solo/Duo context chip instead of a fake configurable picker.

Advanced numeric controls are collapsed by default. Each recommendation also includes a **Why Pony picked this** explanation and confidence/source badge.

### Automated validation

CI runs:

```bash
python scripts/validate-project.py
node tests/model.test.js
python tests/static.test.py
```

The app also contains a deterministic browser fixture/self-test mode:

```text
?smoke=1
```

which verifies the champion-first flow and asserts that the Ekko Ranked Best result resolves to the current ranked baseline rather than a raw-damage bait build.

## Current-item pool reliability

Pony now resolves completed items from the **current League client store dataset first**, rather than requiring Data Dragon's map flag on every record.

```text
CommunityDragon latest items
→ inStore = true
→ displayInItemSets = true
→ completed item (`to` empty)
→ standard current item id
→ 2300–4000 total gold
→ no champion-specific / deprecated / boots / consumables
→ reject when Riot explicitly marks Summoner's Rift unavailable
```

Data Dragon is merged back in for canonical stats and artwork.

If current-client item data cannot be loaded, Pony falls back to Data Dragon, then to a small local safe item set instead of failing with zero build paths.

The analysis error card provides **Try again** and **Change champion** without requiring a page refresh.

## Champion-first UX

Pony deliberately does **not** calculate a champion on first page load.

The flow is now:

```text
Open Pony
  ↓
Load current champion roster
  ↓
Show champion picker
  ↓
User chooses champion
  ↓
Auto-select likely Solo/Duo role
  ↓
Show analysis loader
  ↓
Fetch champion detail + calculate
  ↓
Show recommended runes / 1 → 2 → 3 item path
```

The analysis screen includes **Change champion**, which returns to the picker rather than silently recalculating a default champion.

This avoids presenting an empty analysis dashboard or a full-screen "Loading Ekko" experience before the user has chosen Ekko.

Pony is a League of Legends OTP build optimiser focused on **Ranked Solo/Duo only**.

## Current product rules

Pony treats these as invariants:

- Queue is always **Ranked Solo/Duo (`queueId = 420`)**
- Summoner's Rift only
- Current purchasable items only
- No Arena / ARAM / mode-specific / legacy / removed item candidates
- Champion + role determine rune candidates
- Unfiltered cross-queue empirical rune priors are not used
- Current Riot Data Dragon version is resolved dynamically at runtime
- CommunityDragon `latest` may supplement current client mechanics/static data
- Build order matters; impossible or nonsensical orderings are penalised/removed

Ekko has the most detailed exact quick-exit model:

```text
Q1 → E2 → AA → Passive → leave → Q2
```

## UX improvements in this package

The page no longer looks dead while calculations run.

Pony now shows a full loading/analysis overlay with states such as:

```text
Loading current League data
Resolving current patch and Summoner's Rift data…

Analysing Ekko
Ranked Solo/Duo · queue 420 · evaluating runes and valid 1 → 2 → 3 item paths…
```

The same loader appears when changing champion/settings that trigger a heavy recalculation.

## Ekko safeguards

The Ekko path simulator now:

- applies Rabadon's AP multiplier
- models Shadowflame low-HP amplification
- models Stormsurge delayed damage
- models Lich Bane burst
- models Nashor's on-hit contribution
- models Void/magic penetration
- rejects Rabadon/Void/Zhonya first-item paths
- favours realistic first-item assassin purchases
- weights build sequence instead of only final completed stats
- excludes invalid map/mode items

This is intended to prevent nonsense recommendations such as:

```text
Hextech Gunblade → Crown of the Shattered Queen → Cruelty
```

or:

```text
Rabadon's → Void Staff → Shadowflame
```

as default Ekko Jungle builds.

## Dynamic data

At startup Pony resolves:

```text
https://ddragon.leagueoflegends.com/api/versions.json
```

and loads the newest available Riot Data Dragon static data.

It also uses CommunityDragon `latest` for current-client information where appropriate:

```text
https://raw.communitydragon.org/latest/
```

No Riot developer API key is embedded in the browser.

## Empirical ranked data

Any future population/build statistics must be explicitly scoped to:

```text
queueId = 420
```

Pony currently does **not** treat unfiltered CommunityDragon recommended rune pages as SoloQ population evidence.

For true SoloQ win-rate / pick-rate / sample-size priors, use a backend or dataset that can guarantee queue 420 and current-patch filtering.

## Run locally

```bash
python scripts/validate-project.py
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## GitHub Pages

This repository should be published directly from the branch.

In GitHub:

**Settings → Pages**

Set:

```text
Source: Deploy from a branch
Branch: master
Folder: / (root)
```

Use `main` instead if you change your default branch.

There should be **no custom GitHub Pages deploy workflow**.

`.github/workflows/validate.yml` only validates the project.

## Push this package over the existing repo

From the repository root:

```bash
# replace the repository contents with this package

git add -A
git commit -m "Fix Pony SoloQ optimiser and loading UX"
git push
```

`git add -A` is important because it also stages deletion of obsolete workflow/files.

## Expected site

For the current repository:

```text
https://shial4.github.io/Ponny/
```

GitHub Pages branch publishing may take a minute or two after the commit.

## Disclaimer

Pony is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.

League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
