from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
checks={
 'champion-first picker':'Who do you OTP?' in html,
 'custom role control':'id="roleChoices"' in html,
 'custom objective control':'id="goalChoices"' in html,
 'rank tabs':'id="rankTabs"' in html,
 'advanced controls collapsed':'class="panel advancedShell"' in html,
 'why explanation':'id="reasonPanel"' in html,
 'ranked prior':'SOLOQ_PRIORS' in html,
 'Ekko DH prior':'keystone:"Dark Harvest"' in html,
 'Ekko Inspiration prior':'secondaryTree:"Inspiration"' in html,
 'Ekko Dusk core':'items:["Dusk and Dawn","Shadowflame","Rabadon\'s Deathcap"]' in html,
 'queue 420':'RANKED_SOLO_QUEUE_ID=420' in html,
 'current item resolver':'currentCompletedItems' in html,
 'smoke harness':'runSmokeSuite' in html,
}
failed=[name for name,ok in checks.items() if not ok]
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL'),name)
if failed: raise SystemExit('failed: '+', '.join(failed))

# Reliability guardrails must remain in production.
for marker in [
    "hardCompatible",
    "primaryStat",
    "affinityConfidence",
    "stat-compatible current items",
    "AP scaling",
]:
    assert marker in html or marker in Path('src/item-engine.js').read_text() or marker in Path('src/champion-engine.js').read_text(), marker
print('PASS stat-affinity reliability guardrails')
