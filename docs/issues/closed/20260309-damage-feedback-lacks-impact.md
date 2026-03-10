Discovery date: 2026-03-09

What is wrong or missing:
Damage events are not visually obvious or satisfying enough. Hits need clearer impact feedback such as stronger flashes, color response, sparks, or similar short-lived effects.

How to reproduce or observe it:
Take damage repeatedly during a run and watch for how easy it is to notice the exact hit moment without checking UI state. Compare the current response to other moment-to-moment feedback like boosts or movement changes.

Why it matters:
Weak damage feedback makes hits harder to parse, lowers perceived responsiveness, and reduces the sense of consequence during traversal and obstacle encounters.

Known constraints, suspected cause, or likely starting points:
Keep the underlying damage rules in deterministic engine/state code and limit this work to presentation unless a simulation bug is also found. Likely starting points are the run-scene presentation path in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts) and related runtime rendering/view modules under [src/game/runtime](/Users/akofink/dev/repos/deeper-trail/src/game/runtime).

Resolution note (2026-03-10): Added a dedicated transient damage-feedback runtime helper and hooked it into the run-scene renderer so hazard hits now produce a short screen flash, avatar flash, impact ring, and spark burst. Covered the helper with unit tests; browser smoke verification remains pending in this environment.
