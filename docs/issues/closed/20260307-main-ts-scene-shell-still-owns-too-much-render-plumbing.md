Discovery date: 2026-03-07

# `src/main.ts` still owns too much scene-render plumbing

## What is wrong or missing

The recent runtime extractions helped, but [`src/main.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/main.ts) is still 1807 lines and still contains a large amount of scene-specific draw orchestration, Pixi text reset work, chip composition, module-meter placement, and overlay-card setup.

The hottest section is the run-scene draw path around [`src/main.ts:1038`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/main.ts#L1038), where the shell still:

- resets most shared text objects manually every frame
- draws each objective family inline
- lays out HUD rows and module labels inline
- chooses and renders overlay-card state inline

## How to reproduce or observe it

- Open [`src/main.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/main.ts) and scan the `drawRunScene()` and `drawMapScene()` sections.
- Compare that file to the extracted helpers already living under [`src/game/runtime`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/game/runtime).
- Note that the deterministic content/view-model logic is now split out, but the Pixi shell still carries a large amount of repeated scene composition and label-reset plumbing.

## Why it matters

- This is now the main maintainability hotspot in the repo.
- Small HUD or overlay tweaks still require editing a large mixed-responsibility file.
- The current shape raises regression risk because render concerns, text lifecycle, and scene composition are still tightly coupled.

## Constraints, suspected cause, or likely starting points

- Keep gameplay rules in the engine/runtime helpers; this is a presentation-shell follow-up, not a simulation rewrite.
- Likely extractions:
  - shared HUD/chip composition helpers
  - overlay-card state selection/layout
  - run-scene objective draw helpers
  - module-meter and label placement
- Good starting files:
  - [`src/main.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/main.ts)
  - [`src/game/runtime/runHudLayout.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/game/runtime/runHudLayout.ts)
  - [`src/game/runtime/mapSceneCards.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/game/runtime/mapSceneCards.ts)
  - [`src/game/runtime/sceneHudContent.ts`](/Users/akofink/dev/repos/deeper-trail/.worktrees/issue-triage-20260307/src/game/runtime/sceneHudContent.ts)

## Resolution note

Closed on 2026-03-07 after extracting the run-scene objective draw path and HUD view-model assembly into dedicated runtime presentation helpers, adding targeted tests for beacon label view state and run HUD composition, and trimming more inline scene plumbing out of `src/main.ts`.
