Discovery date: 2026-03-09

Resolution date: 2026-03-10

Resolution note:
The map alert no longer fires on initial spawn. Route-board guidance now appears when the player completes the first node and the map becomes relevant, so onboarding stays focused on movement before travel unlocks.

What was wrong or missing:
The opening alert that teaches `A` to open the map fired immediately and competed with the player's first-run focus on simply starting the level.

How to reproduce or observe it:
Start a fresh run and watch the initial HUD messaging before the player has had a chance to move through the first level.

Why it mattered:
The current first impression spent scarce attention on a secondary control instead of onboarding the core movement loop, which weakened early readability.

Known constraints, suspected cause, or likely starting points:
The startup/tutorial prompt timing in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts) needed to defer map guidance until the route board actually mattered.
