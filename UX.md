# Pony UX flow

## First visit

The first meaningful action is selecting a champion.

Pony loads only the roster/static data required to present the picker. The analysis dashboard remains hidden.

```text
Pony
Who do you OTP?

[ Search champions... ]

Aatrox  Ahri  Akali  ...
...
```

## Champion selected

After selection, Pony:

1. opens the analysis view;
2. automatically selects the champion's likely Solo/Duo role;
3. shows an explicit analysis loader;
4. fetches champion-specific current-patch detail;
5. evaluates runes and valid item paths;
6. reveals the completed recommendation.

## Changing champion

`Change champion` returns to the picker.

Pony does not automatically substitute another champion or immediately calculate Ekko on page load.

## Loading states

Initial/static-data loading stays inside the champion picker.

The blocking full-screen loader is reserved for an explicit user action:

```text
Analysing Ekko
Loading current champion data, then calculating the strongest Ranked Solo/Duo setup...
```

This makes it clear that work is happening because of the champion the user just selected.
