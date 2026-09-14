# Pony

Pony is a Ranked Solo/Duo (`queueId = 420`) League of Legends OTP build/rune optimiser.

## Architecture

Pony no longer has a `simulateGeneric()` assassin/mage/fighter fallback.

Every selected champion goes through the same mechanics pipeline:

```text
current Riot champion detail
+ CommunityDragon current champion data
+ CommunityDragon game-bin data when available
+ Meraki champion data when available
        ↓
compile Passive + Q + W + E + R
        ↓
extract base damage / ratios / damage type / CC / mobility / sustain / on-hit / execute signals
        ↓
objective-specific combat rotation
        ↓
all legal rune pages + current SR items
        ↓
1 → 2 → 3 item simulations
        ↓
recommendation + rune-vs-rune explanation
```

The UI reports **mechanics coverage**. Current data sources are redundant by design because no single public static schema cleanly describes every League mechanic.

## Important accuracy policy

Pony compiles every champion rather than silently substituting a generic class formula. If Riot champion detail cannot be loaded, analysis fails visibly instead of manufacturing a recommendation.

Highly stateful champion mechanics (forms, weapon states, pets, terrain interactions, unusual resets) are represented from current source signals and the model exposes coverage rather than claiming perfect frame-by-frame certainty. This is intentionally different from the old archetype fallback.

## Ranked data

- Queue: Ranked Solo/Duo only (`420`)
- Current Summoner's Rift items only
- Ranked priors are used only where Pony has explicit current-patch/queue evidence
- Mathematical objectives remain separate from the Ranked Best recommendation

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Tests

```bash
node tests/engine.test.js
node tests/all-roster.test.js
python scripts/validate-project.py
```

The roster regression compiles and simulates every champion in the bundled roster fixture and fails if the engine cannot model Passive/Q/W/E/R structure.

## GitHub Pages

Publish directly from `master` → `/ (root)` in **Settings → Pages**. No custom Pages deploy workflow is required.

## Disclaimer

Pony is not endorsed by Riot Games. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
