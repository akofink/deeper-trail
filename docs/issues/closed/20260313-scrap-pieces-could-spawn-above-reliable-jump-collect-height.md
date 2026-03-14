Discovery date: 2026-03-13

Problem:
Some authored scrap pickups could spawn above the default vehicle's reliable jump-collect envelope, especially on later nature and anomaly beats.

Why it mattered:
Scrap is the baseline recovery and upgrade currency. Unreachable pickups make deterministic runs feel unfair and can suppress repair or module options through no fault of player input.

Resolution:
Run layout generation now lowers out-of-range pickups into a deterministic reachable band while preserving some vertical variation, and `tests/runLayout.test.ts` locks both the authored placement values and a cross-biome reachability guard.
