Discovery date: 2026-03-09

What is wrong or missing:
The opening alert that teaches `A` to open the map fires immediately and competes with the player's first-run focus on simply starting the level.

How to reproduce or observe it:
Start a fresh run and watch the initial HUD messaging before the player has had a chance to move through the first level.

Why it matters:
The current first impression spends scarce attention on a secondary control instead of onboarding the core movement loop, which weakens early readability.

Known constraints, suspected cause, or likely starting points:
Review startup/tutorial prompt timing in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts). If the prompt remains, it likely needs to be deferred until the player has context for why the map matters.
