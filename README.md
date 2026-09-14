# Important: first GitHub Pages deployment

Before the first workflow can publish, open:

**Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**

GitHub's Pages deployment action requires Pages to already be enabled/configured for the repository. If Pages is disabled, `actions/deploy-pages` can fail with a 404/Not Found style deployment error.

If the repository is private, your GitHub plan must also support Pages for private repositories.

The workflow intentionally treats Riot/CommunityDragon refresh errors as warnings so an upstream outage cannot prevent Pony itself from deploying.

---

# Pony

**Pony** is a static League of Legends OTP build optimiser.

It is deliberately **patch-dynamic**: the GitHub Pages deployment refreshes League data every six hours, and the browser independently checks Riot's latest Data Dragon version when a user opens the site.

## Dynamic data strategy

Pony uses two layers:

### 1. Riot Data Dragon — canonical official static data

At deploy time and at runtime Pony resolves:

```text
https://ddragon.leagueoflegends.com/api/versions.json
```

and loads the newest published:

- champions
- items
- rune trees
- summoner spells
- champion / item / rune images

No version is hard-coded.

Riot documents that Data Dragon is manually published and may not update immediately with a League patch.

### 2. CommunityDragon `latest` — current-client freshness supplement

Pony also reads the rolling current-client data under:

```text
https://raw.communitydragon.org/latest/
```

including:

- champion summary
- item client data
- perks
- perk styles
- champion rune recommendations
- champion/perk style mapping
- selected champion detail

This layer is used to:

- enrich ability/mechanics signals;
- overlay current client item descriptions, prices and parseable stats;
- give rune scoring a current League-client recommendation prior;
- detect data newer than the currently published Data Dragon bundle.

The UI shows the active Riot Data Dragon version and snapshot refresh time instead of pretending the two sources are always on the same patch.

## Automatic refresh

`.github/workflows/pages.yml` runs:

- on every push to `main` or `master`;
- manually through `workflow_dispatch`;
- every six hours via GitHub Actions schedule.

The deployment executes:

```bash
python scripts/fetch-latest-data.py
```

which creates a static snapshot under `data/`.

This means Pony continues to work if a client temporarily cannot reach Riot/CommunityDragon.

The browser still performs its own no-cache version check and can move to a newer Riot Data Dragon version before the next scheduled deployment.

## Why not put a Riot API key in the static site?

Never put a Riot developer key in browser JavaScript or a public GitHub repository.

Pony's current static-data use case does **not** need an API key. Data Dragon is public.

If Pony later adds:

- Riot ID lookup
- match history
- summoner ranked data
- personal OTP performance

those authenticated Riot API requests should go through a backend/serverless function with the key stored as a secret.

## Local development

Serve the repository root:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

To build the same data snapshot as production:

```bash
python scripts/fetch-latest-data.py
```

Internet access is required for the refresh script.

## Deploy

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Choose **GitHub Actions** as the Pages source.

The included workflow handles refresh + deployment.

## Data freshness / accuracy

There are two different concepts:

**Data freshness** is automatic and dynamic.

**Champion combat modelling** is separate.

Ekko currently has an explicit quick-exit combat adapter. Other champions use an adaptive mechanics model built from champion/role/objective signals. A current item/rune feed does not magically make an approximate champion combo model frame-perfect.

The long-term path is a champion mechanics DSL that models spell events, passives, resets, executes, shields/heals, forms, pets, multi-hit rules and on-hit application exactly.

## Disclaimer

Pony is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.

League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
