Discovery date: 2026-03-07

# Node arrival flow still lacks authored encounter beats

## What is wrong or missing

Travel arrival is still mostly passive reward bookkeeping. Reaching a node currently resolves into a fixed biome reward such as fuel, scrap, health, or scanner gain, but there is no authored encounter/event beat on arrival that changes the player's next decision.

Current behavior in [`src/game/runtime/expeditionFlow.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/src/game/runtime/expeditionFlow.ts) is a straight biome switch inside `applyArrivalRewards(...)`:

- `town` grants fuel
- `ruin` grants scrap
- `nature` grants health
- `anomaly` grants scanner progress and shield recharge

That means node visits are still dominated by `travel -> run objective -> travel` with little interruption from events, discoveries, or arrival-specific choices.

## How to reproduce or observe it

- Read [`src/game/runtime/expeditionFlow.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/src/game/runtime/expeditionFlow.ts), especially `applyArrivalRewards(...)` and `travelToNodeWithRuntimeEffects(...)`.
- Read [`tests/expeditionFlow.test.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/tests/expeditionFlow.test.ts): the travel loop assertions only verify deterministic reward and bookkeeping changes.
- Play a few route hops in the current build: arrival copy changes by biome, but the result is still an automatic stat bump rather than a seed-stable event, tradeoff, or notebook-conditioned outcome.

## Why it matters

- [`docs/01-core-loop.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/docs/01-core-loop.md) says nodes should include a problem, scavenging/interpretation, and route-shaping decisions, but the arrival layer currently adds very little beyond resources.
- [`FEATURE_LIST.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/FEATURE_LIST.md) already calls out authored encounter outcomes as a remaining content/progression gap.
- Without arrival beats, the map game risks flattening into efficient node clearing instead of feeling like a strange journey with interruptions, discoveries, and situational choices.

## Constraints, suspected cause, or likely starting points

- Keep the first pass deterministic and seed-stable. This should be a small encounter/event table, not a random free-form content system.
- Start narrow: one or two authored arrival events that branch on biome, notebook state, or module capability is enough.
- Prefer putting event selection/rules in deterministic helpers rather than embedding encounter logic in [`src/main.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/src/main.ts).
- Likely starting files:
  - [`src/game/runtime/expeditionFlow.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/src/game/runtime/expeditionFlow.ts)
  - [`src/game/state/gameState.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/src/game/state/gameState.ts)
  - [`tests/expeditionFlow.test.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/tests/expeditionFlow.test.ts)
  - [`docs/01-core-loop.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/docs/01-core-loop.md)
  - [`docs/06-puzzles-and-meta-mystery.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-triage/docs/06-puzzles-and-meta-mystery.md)
