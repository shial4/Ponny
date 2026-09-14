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

## Reliability regression suite

The engine test suite now contains explicit regressions for:

- **Ekko**: current-client magic-assassin metadata + current coefficients compile to AP-primary; pure AD/lethality items such as Profane Hydra are hard-rejected for burst/trade search.
- **Qiyana**: current-client physical-assassin metadata compiles to AD-primary; lethality first items outrank Bloodthirster for assassination objectives.
- **Corki**: magic damage type alone cannot incorrectly force a marksman into AP-only itemization.
- **Full roster**: all 170 bundled champions compile Passive/Q/W/E/R models and can execute the shared simulator fixture.

A headless browser is not run inside the artifact environment because local/file navigation is administratively blocked there. Production still contains the deterministic `?smoke=1` harness for browser-side validation after deployment.
