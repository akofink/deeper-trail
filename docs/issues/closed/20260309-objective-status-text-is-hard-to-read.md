Discovery date: 2026-03-09

What is wrong or missing:
Objective and relay-state messaging is hard to read, changes too quickly while driving past biome triggers, and currently relies on too much small text.

How to reproduce or observe it:
Drive through a village biome or any area that updates objective state rapidly and watch the objective copy in the HUD/prompt layers.

Why it matters:
Players can miss the active goal or misread a state transition, which directly harms route planning and undermines the readable-map/readable-HUD goals in the current architecture.

Known constraints, suspected cause, or likely starting points:
Likely involves the HUD/prompt rendering paths in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts). The fix may require both copy reduction and throttling/stabilizing when objective state changes are surfaced.

Resolution note (2026-03-09):
Run-scene objective prompts now use shorter one-line copy, quantized progress steps, and a short sticky timer so the banner stays readable when the player clips through triggers at speed. The overlay also shows explicit objective progress alongside the prompt instead of swapping through long text-only status lines.
