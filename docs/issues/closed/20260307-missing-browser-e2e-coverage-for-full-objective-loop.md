Discovery date: 2026-03-07

# Missing browser end-to-end coverage for the full biome-objective loop

## What is wrong or missing

The project has strong deterministic unit coverage, but it still lacks a committed browser-level regression path that exercises the richer run objective loop end to end across the current runtime shell.

This matters more now because the run scene includes multiple biome-specific objective verbs and UI states:

- service bays
- impact plates
- canopy lifts
- sync gates
- relay auto-link / ordered / steady / airborne / boosted variants

There is Playwright tooling in [`scripts/web_game_playwright_client.js`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/scripts/web_game_playwright_client.js), but there is no repo script or committed browser test suite that is part of `npm run check`.

## How to reproduce or observe it

- Open [`package.json`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/package.json): the quality gate only runs lint, typecheck, and Vitest.
- Search the repo for Playwright coverage: the custom client exists, but there are no committed automated browser tests under `tests/` or a dedicated e2e command in `package.json`.
- Compare this with [`progress.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/progress.md), which repeatedly references manual/headed Playwright validation and still calls out full-loop automation as future work.

## Why it matters

- Many current regressions are most likely to appear in renderer-shell wiring, input sequencing, prompt priority, resize/fullscreen behavior, or objective/UI synchronization rather than pure sim helpers.
- Unit tests alone will not catch those integration failures.
- The repo now has enough runtime complexity that one deterministic browser smoke path would buy real protection.

## Constraints, suspected cause, or likely starting points

- Keep the browser coverage narrow and deterministic; one or two stable smoke scenarios are enough to start.
- Prefer reusing the existing `window.render_game_to_text` and `window.advanceTime(ms)` hooks instead of building a separate automation surface.
- Start with a scripted path that proves:
  - node completion
  - one biome-specific objective interaction
  - travel back to map state
  - route/notebook/objective UI staying in sync
- Likely starting files:
  - [`scripts/web_game_playwright_client.js`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/scripts/web_game_playwright_client.js)
  - [`src/main.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/main.ts)
  - [`package.json`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/package.json)
  - [`progress.md`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/progress.md)

## Resolution note

Resolved on 2026-03-07 by adding deterministic `?seed=` boot support plus a committed Playwright smoke path in `scripts/e2e/fullObjectiveLoop.js`, then wiring that browser replay into `npm run test:e2e` and `npm run check`.
