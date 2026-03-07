Discovery date: 2026-03-07

Resolution note (2026-03-07): fixed by making the synthesized goal payoff depend on ordered core clue discovery. Goal routes now preview a profile that branches relay priming, arrival reward, and one run-layout assist.

# Notebook clue mix does not yet branch the goal-node payoff

## What is wrong or missing

The notebook now affects route intel, first-arrival beats, and the expedition-goal run, but the late payoff is still a single fixed modifier. Once synthesis is unlocked, the current goal-node variation is always the same: the source approach starts with relay `B0` pre-linked.

That means the clue families (`ruin`, `nature`, `anomaly`) do not yet create meaningfully different end-state outcomes. The mystery layer currently converges into one deterministic reward instead of branching the final run or arrival based on what the player learned.

## How to reproduce or observe it

- Read [`src/game/runtime/goalSignal.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/goalSignal.ts): the goal payoff only checks `synthesisUnlocked` and the selected goal node, then always applies the same relay primer.
- Read [`tests/goalSignal.test.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/tests/goalSignal.test.ts): coverage confirms the current behavior is binary, not clue-composition-driven.
- Compare that behavior with [`docs/06-puzzles-and-meta-mystery.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/docs/06-puzzles-and-meta-mystery.md), which frames the notebook as a mystery layer that should deepen rather than stop at route guidance plus one fixed goal-run advantage.

## Why it matters

- The project pitch depends on the journey opening into stranger, more consequential late-game states.
- A single fixed synthesis reward makes the notebook feel completed too early and flattens replayability at the exact point where clue discovery should differentiate runs.
- Branching the goal-node payoff by clue mix would connect exploration history, mystery progress, and final-run pressure much more tightly.

## Constraints, suspected cause, or likely starting points

- Keep the payoff deterministic and seed-stable.
- Prefer branching the goal-node arrival/run state or final encounter framing instead of adding more notebook text.
- A good first slice is to let different clue mixes mutate different parts of the goal run, for example relay order, starting links, sync timing, or arrival resources.
- Likely starting files:
  - [`src/game/runtime/goalSignal.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/goalSignal.ts)
  - [`src/game/runtime/expeditionFlow.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/expeditionFlow.ts)
  - [`src/engine/sim/notebook.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/engine/sim/notebook.ts)
  - [`docs/06-puzzles-and-meta-mystery.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/docs/06-puzzles-and-meta-mystery.md)
