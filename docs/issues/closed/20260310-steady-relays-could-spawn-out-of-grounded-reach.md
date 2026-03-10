Resolution note (2026-03-10): fixed by giving `town` relay placements a lower deterministic height profile so every steady-link relay stays inside the grounded interaction radius.

Discovery date: 2026-03-10

Some of the relays that require the rider to remain steady could spawn high enough above the road that
they were only reachable by jumping into range first, which breaks the steady-link rule for town runs.

Repro / observation:
- Start town runs across a few seeds and approach each relay without jumping.
- The higher terrain beats could place relay centers above the grounded interaction bubble even while the
  player was directly underneath them.

Why it matters:
- The town biome teaches the steady-link verb, so unreachable grounded relays make the objective feel
  contradictory and erode the intended readable ruleset.

Likely starting points:
- `src/game/runtime/runLayout.ts`
- `tests/runLayout.test.ts`
