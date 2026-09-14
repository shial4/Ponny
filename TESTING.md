# Pony testing

Required checks before deployment:

```bash
node --check src/champion-engine.js
node --check src/rune-engine.js
node --check src/item-engine.js
node tests/engine.test.js
node tests/all-roster.test.js
python scripts/validate-project.py
```

Regression requirements:

- no `simulateGeneric()` function in production;
- every selected champion must compile Passive + Q + W + E + R;
- all-roster fixture must compile and simulate;
- Qiyana assassin item fit must prefer a lethality/haste first item over Bloodthirster in the reference fixture;
- invalid/legacy items must not enter the current Summoner's Rift candidate pool;
- rune comparison keeps item path and target fixed;
- Ranked Best and mathematical objectives stay distinct.
