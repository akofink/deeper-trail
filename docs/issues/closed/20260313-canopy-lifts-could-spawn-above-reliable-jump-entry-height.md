Discovery date: 2026-03-13

Problem:
Nature-biome canopy lifts were authored high enough that the later bloom sat at the edge of the base jump apex, making it effectively unreachable during normal play.

Why it mattered:
Nature runs require canopy lift charting to complete their secondary objective. An unreachable lift could soft-block a deterministic run despite correct player input.

Resolution:
Lowered the authored nature canopy lift placements in `src/game/runtime/runLayout.ts` so both blooms sit inside a reliable single-jump entry envelope, and added a regression test in `tests/runLayout.test.ts`.
