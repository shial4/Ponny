# Pony testing

## CI

```bash
python scripts/validate-project.py
node tests/model.test.js
python tests/static.test.py
```

## Deterministic browser fixture

Open:

```text
index.html?fixture=1
```

This avoids network data and renders a deterministic fixture roster.

## Browser smoke suite

Open:

```text
index.html?smoke=1
```

The page runs an internal smoke suite and sets:

```text
document.body.dataset.smoke = "pass"
```

when all checks succeed. The suite verifies:

- champion picker is the initial view;
- Ekko analysis returns rows;
- Ranked Best uses Dark Harvest + Inspiration;
- Ranked Best starts Dusk and Dawn → Shadowflame → Rabadon's Deathcap;
- legacy/mode-specific items are absent;
- Quick Trade still produces a valid alternative result set.
