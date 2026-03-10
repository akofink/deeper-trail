Discovery date: 2026-03-10

What was wrong:
Some town relays that require the steady rule could spawn high enough that the default vehicle could only reach them by jumping, which directly conflicted with the grounded activation requirement.

How it was observed:
In town runs, compare the relay height against the player's grounded interact radius. The middle and late relays could sit above the grounded activation band.

Why it mattered:
It created an impossible or contradictory objective prompt in one of the baseline biome rules, which breaks readability and undermines deterministic fairness.

Resolution:
Town relay placement now uses a lower deterministic height band that stays within grounded steady-link reach for the default player geometry and scanner radius. Added a regression test in `tests/runLayout.test.ts` to lock that contract.
