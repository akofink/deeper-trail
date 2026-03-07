Discovery date: 2026-03-07

# Browser smoke still skips non-town objective verbs

## What is wrong or missing

The repo now has deterministic browser smoke coverage in `npm run check`, but that path only completes a fixed `town` seed with relays plus service bays. The other biome-specific objective verbs that make the current run loop interesting are still only covered at the unit-helper level:

- `ruin` impact plates
- `nature` airborne relays plus canopy lifts
- `anomaly` boost/sync timing plus sync gates

That means shell-level regressions in those paths can still land even when the quality gate is green.

## How to reproduce or observe it

- Read [`scripts/e2e/fullObjectiveLoop.js`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/scripts/e2e/fullObjectiveLoop.js): the smoke hard-codes `E2E_SEED = "e2e-1"` and asserts the run starts on a `town` node.
- The same script only drives `beacon` and `service` targets via `targetSequence()`, `currentTarget()`, and `completeTownRun()`. There is no browser automation for impact plates, canopy lifts, or sync gates.
- Compare that with the current runtime rule surface in [`src/game/runtime/impactPlates.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/impactPlates.ts), [`src/game/runtime/canopyLifts.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/canopyLifts.ts), and [`src/game/runtime/syncGates.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/syncGates.ts).
- Read the browser test inventory in [`tests/fullObjectiveLoop.test.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/tests/fullObjectiveLoop.test.ts): coverage is for the automation helpers, not for additional biome-specific browser paths.

## Why it matters

- The remaining objective verbs are exactly where renderer-shell wiring, prompt timing, camera pacing, and input sequencing are most likely to drift away from the deterministic sim helpers.
- Unit tests prove the helpers, but they do not prove the live run scene still exposes those verbs in a completable way.
- Replayability depends on biome variation feeling trustworthy; right now only the `town` loop is protected end to end.

## Constraints, suspected cause, or likely starting points

- Keep the browser layer narrow and deterministic. One smoke route per uncovered biome is enough to start.
- Reuse the existing `?seed=` boot path plus `window.render_game_to_text` and `window.advanceTime(ms)` hooks instead of adding a second automation surface.
- Prefer extending the current script into small biome-specific runners rather than replacing it with a large generic bot all at once.
- Likely starting files:
  - [`scripts/e2e/fullObjectiveLoop.js`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/scripts/e2e/fullObjectiveLoop.js)
  - [`tests/fullObjectiveLoop.test.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/tests/fullObjectiveLoop.test.ts)
  - [`src/game/runtime/impactPlates.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/impactPlates.ts)
  - [`src/game/runtime/canopyLifts.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/canopyLifts.ts)
  - [`src/game/runtime/syncGates.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/docs-issue-future-work/src/game/runtime/syncGates.ts)

---

## Resolution (2026-03-07)

Added three biome-specific browser smoke paths in `scripts/e2e/`:

- **`ruinSmoke.js`** — drives `e2e-0` (ruin start): verifies ordered-relay linking and automatic impact-plate shattering on hard landing.
- **`natureSmoke.js`** — drives `e2e-2` (nature start): verifies airborne-relay activation (jump-then-link) and automatic canopy-lift charting (0.6 s hover).
- **`anomalySmoke.js`** — drives `e2e-3` (anomaly start): verifies boost-sync relay activation (Shift-burst + phase-window timing) and sync-gate stabilisation (jump through at run speed during the phase window).

New exported helpers in `scripts/e2e/fullObjectiveLoop.js`:

- `isPhaseWindowOpen(elapsedSeconds, objectiveIndex)` — mirrors engine phase logic.
- `impactPlateJumpWindow(state)` — locates a ruin plate in the jump approach range.
- `airborneBeaconApproachState(target, state)` — approach signals for nature airborne beacons.
- `syncGateApproachState(target, state, gateIndex)` — approach signals for anomaly sync gates.

Four new unit tests added to `tests/fullObjectiveLoop.test.ts` covering each helper.

`package.json` `test:e2e` updated to run all four biome smokes after the existing town smoke.
