# Pony reliability contract

Pony must prefer **no recommendation** over a recommendation that is mechanically incompatible with the selected champion.

## Source order

1. **CommunityDragon current client champion data** — current tactical damage type, roles, current ability text/coefficients/effect arrays.
2. **Riot Data Dragon** — canonical champion/item/rune records and artwork.
3. **Meraki champion mechanics** — structured ability scaling labels/components. This is used mainly to identify what a spell scales from; current client values win when available.
4. **CommunityDragon bin data** — available to the compiler for complex mechanics/coverage.

Data Dragon is manually published by Riot and can lag the game patch. Pony therefore resolves the newest Data Dragon version dynamically and also reads CommunityDragon `latest`.

## Champion model invariants

Every selected champion is compiled into:

- Passive
- Q
- W
- E
- R
- damage type per ability
- rank bases
- AP / total AD / bonus AD / HP / defensive ratios when available
- on-hit/basic-attack dependency
- CC
- mobility
- healing/shielding
- execute / missing-health behaviour
- objective-specific combat sequence

There is no `simulateGeneric()` class formula.

## Stat-affinity guardrail

Before item permutations are generated, Pony determines the champion's scaling affinity from observed spell ratios and current-client role/damage metadata.

Examples:

- Ekko → AP-primary
- Qiyana → AD-primary
- Corki → marksman/AD-compatible even though much of his damage is magic
- genuinely hybrid champions remain hybrid

When affinity confidence is high:

- pure AD/lethality/crit items cannot enter an AP-primary burst build;
- pure AP/magic-penetration items cannot enter an AD-primary burst build;
- durability objectives may still admit defensive items;
- hybrid champions are not hard-filtered into one stat.

This guardrail exists specifically to prevent regressions such as `Profane Hydra → Umbral Glaive → Essence Reaver` on Ekko.

## Ranked Best vs mathematical objectives

`Ranked Best` may use an explicit current-patch Ranked Solo/Duo prior only when Pony has a verified queue-420 prior for that champion/role/patch.

Other presets are mechanics-first:

- Max burst
- Quick trade
- Extended
- Tank / MR
- Poke

A model-only recommendation is labelled as such.

## Queue policy

All empirical priors must be:

```text
queueId = 420
Ranked Solo/Duo
current patch
role-specific
```

No Flex, Normal, ARAM, Arena, Swiftplay/Quickplay or mixed-queue recommendation may be used as ranked evidence.

## Fail closed

Pony stops recommendation generation when:

- fewer than three current compatible completed items survive;
- the champion model has no Q/W/E/R model;
- an AP-primary model produces no AP-compatible item candidates;
- an AD-primary model produces no AD-compatible item candidates.

A visible error is preferable to fabricated precision.
