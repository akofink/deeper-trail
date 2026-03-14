# DEEPER TRAIL

Deeper Trail is a browser-first 2D journey game prototype built with TypeScript, Vite, and PixiJS. The project is aiming at a deterministic, replayable, serverless expedition game that starts with grounded bike travel and gradually opens into stranger routes, stranger machines, and a layered mystery.

The design center is stable:

- One persistent machine that evolves through modules instead of menu-based vehicle swaps.
- Seeded runs whose world state, route structure, and mystery beats stay replayable and discussable.
- Obstacles that unlock through capabilities and verbs, not flat stat inflation.
- A route-board map and compact HUD that keep the game readable as it expands in scope.

## Current prototype

The current playable slice already covers the core loop this repo is building toward:

- deterministic world generation and seeded travel between map nodes
- biome-specific run objectives in `town`, `ruin`, `nature`, and `anomaly` routes
- persistent subsystem levels and condition, with repair and install actions
- a lightweight notebook / clue chain that turns route clears into a small mystery arc
- deterministic share codes and browser automation hooks for regression coverage

This is still a prototype, not a content-complete vertical slice. The near-term roadmap is about strengthening the current loop before pushing into broader world scale.

## Roadmap at a glance

`Now`
- tighten the current expedition loop so travel, biome verbs, upgrades, notebook clues, and route payoffs read as one coherent run
- continue tightening the browser shell split so bootstrap-session assembly, runtime/session ownership, and renderer bindings stay in focused helpers instead of drifting back together
- keep map readability, HUD clarity, and deterministic simulation quality high as content grows

`Next`
- deepen authored mystery payoffs and route consequences so clue order changes more than overlay text
- add more route-site interactions and upgrade consequences that change how the machine is played
- expand automated coverage around full expedition flows and route-specific objective variants

`Later`
- grow from the current local expedition format into larger-scale travel, stranger fabrication, and more layered puzzle structures without breaking the deterministic browser-first format

See [docs/README.md](/Users/akofink/dev/repos/deeper-trail/docs/README.md) for the canonical docs map and [docs/09-mvp-scope.md](/Users/akofink/dev/repos/deeper-trail/docs/09-mvp-scope.md) for the fuller roadmap breakdown.

## Documentation guide

- [docs/README.md](/Users/akofink/dev/repos/deeper-trail/docs/README.md): reading order and doc map
- [docs/00-vision.md](/Users/akofink/dev/repos/deeper-trail/docs/00-vision.md): long-term promise and design guardrails
- [docs/01-core-loop.md](/Users/akofink/dev/repos/deeper-trail/docs/01-core-loop.md): current expedition loop and expansion path
- [docs/09-mvp-scope.md](/Users/akofink/dev/repos/deeper-trail/docs/09-mvp-scope.md): current roadmap priorities and success criteria
- [ARCHITECTURE.md](/Users/akofink/dev/repos/deeper-trail/ARCHITECTURE.md): runtime/module split and rendering guidance
- [IMPLEMENTATION_NOTES.md](/Users/akofink/dev/repos/deeper-trail/IMPLEMENTATION_NOTES.md): practical implementation guidance
- [progress.md](/Users/akofink/dev/repos/deeper-trail/progress.md): change history and recent implementation slices

## Development

- Install dependencies: `npm install`
- Start the game shell: `npm run dev`
- Run the full quality gate: `npm run check`

## Worktree workflow

- Use a repo-local linked worktree under `.worktrees/` for every repo change unless a user explicitly asks for a different flow.
- Check `git worktree list` before creating a new one so you can see active branches and task names.
- Confirm whether another Codex session owns an existing worktree before you merge or delete it. Use local inspection such as `ps -axo pid,etime,command | rg '[c]odex'` and `lsof -a -d cwd -p <pid>` on macOS when needed.
- Create a linked worktree with `git worktree add .worktrees/<task-name> -b <branch-name>`.
- Keep one task per worktree, commit incrementally, merge back into `main`, then remove the linked worktree and merged branch as part of the same task.

## Current code structure

```text
src/
  engine/
    data/      # content pack types + validation
    gen/       # deterministic graph generation
    rng/       # seeded RNG utilities
    sim/       # deterministic simulation actions/rules
  game/
    render/    # Pixi scene rendering helpers
    runtime/   # browser shell, runtime-facing view models, flow helpers, scene plans
    state/     # game state and initialization
  main.ts      # thin browser entrypoint
tests/         # unit tests for engine + runtime behavior
```
