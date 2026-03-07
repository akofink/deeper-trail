Discovery date: 2026-03-07

# Notebook synthesis still has limited gameplay payoff

## What is wrong or missing

The notebook now gives route-choice help, but synthesis currently tops out at marking the strongest connected lead. It still does not unlock a more meaningful gameplay consequence such as authored goal-node variants, encounter outcomes, or notebook-conditioned choices.

Current behavior in [`src/engine/sim/notebook.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/engine/sim/notebook.ts) is:

- first clue: signal-bearing read
- second clue: estimated remaining leg count
- synthesis: append `Best current lead.`

The design doc already describes the notebook as intentionally lightweight, which is accurate but leaves the mystery layer with a weak payoff relative to the rest of the progression.

## How to reproduce or observe it

- Read [`src/engine/sim/notebook.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/engine/sim/notebook.ts), especially `notebookSignalRouteIntel(...)`.
- Read the current prototype notes in [`docs/06-puzzles-and-meta-mystery.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/docs/06-puzzles-and-meta-mystery.md).
- In play, complete one `ruin`, one `nature`, and one `anomaly` node, then inspect the map notebook/route card: the new synthesis state improves guidance, but it does not yet open a distinct new verb or outcome.

## Why it matters

- The project pitch depends on a mystery layer that deepens, not just a route-optimization aid.
- Right now the notebook risks reading as flavor text plus a mild navigation buff instead of a system the player is motivated to complete.
- Strengthening this payoff would better connect exploration, puzzle discovery, and expedition progression.

## Constraints, suspected cause, or likely starting points

- Keep any new payoff deterministic and seed-stable.
- Prefer a consequence that changes route decisions or encounter outcomes rather than only adding more text.
- Likely starting files:
  - [`src/engine/sim/notebook.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/engine/sim/notebook.ts)
  - [`src/game/runtime/mapSceneContent.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/game/runtime/mapSceneContent.ts)
  - [`docs/06-puzzles-and-meta-mystery.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/docs/06-puzzles-and-meta-mystery.md)
  - [`progress.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/progress.md)

## Resolution note

Closed on 2026-03-07 after synthesis was extended to decode the strongest connected lead's arrival profile on the route card, giving the notebook a deterministic route-choice payoff beyond a single label.
