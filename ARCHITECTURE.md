# Architecture

## Architectural goals

- deterministic simulation from seeded inputs
- browser-first static deployment with no backend dependency
- clear separation between simulation rules, runtime assembly, and Pixi rendering
- modular systems that can scale the journey without collapsing readability

## Current repo layout

```text
src/
  engine/
    data/      # content pack types + validation
    gen/       # deterministic graph generation
    rng/       # seeded RNG utilities
    sim/       # deterministic simulation rules and helpers
  game/
    render/    # Pixi drawing helpers and scene renderers
    runtime/   # browser shell, runtime flow, content assembly, layout, and view-model helpers
    state/     # game state and initialization
  main.ts      # thin browser entrypoint
tests/         # engine and runtime regressions
```

## Separation rules

- All gameplay randomness goes through seeded RNG helpers.
- Rendering reads state and prepared view models; it should not define core gameplay rules.
- Deterministic rule changes belong in `src/engine/*`.
- Runtime flow, content assembly, and scene planning belong in `src/game/runtime/*`.
- Pixi drawing and primitive reuse belong in `src/game/render/*`.
- `src/main.ts` should stay thin; browser-shell orchestration belongs in focused helpers under `src/game/runtime/*`.

## Current runtime split

- `engine/sim/*` owns deterministic rules for travel, vehicle wear/repair/install, biome exploration knowledge, run-objective rules, resource changes, share codes, and world-node lookup helpers.
- `game/runtime/*` owns runtime-facing scene state types, initial/reset helpers, browser-shell bootstrap helpers, derived vehicle stats, route and notebook content assembly, HUD/card planning, debug snapshots, expedition-flow bookkeeping, and map/run scene render-plan preparation.
- `game/runtime/*` also owns browser-shell app/context factories that assemble Pixi app bootstrapping and scene-renderer wiring without pushing that object-graph work back into `main.ts`.
- `game/render/*` owns shared Pixi primitives, frame clearing, HUD chrome, route-board drawing, run-scene world drawing, and text/reset helpers.
- `main.ts` should stay as a thin browser entrypoint that delegates Pixi/bootstrap orchestration to browser-shell runtime and render helpers.

## Determinism rules

- identical seeds and inputs must produce identical simulation outcomes
- deterministic helpers should stay small, pure, and directly testable when possible
- route logic, notebook consequences, and objective behavior should be assertable without booting Pixi
- automation hooks such as `window.render_game_to_text` and `window.advanceTime(ms)` are part of the testing surface and should remain stable

## Rendering direction

- favor compact labeled HUD panels, chips, bars, and pips over sentence-heavy overlays
- keep the map scene readable as a navigable route board rather than a raw debug graph
- keep biome readability strong through terrain motifs, palette, skyline/backdrop treatment, and objective telegraphing
- let presentation add feel and emphasis without becoming the source of simulation truth

## Current scene guidance

Run-scene feel is intentionally split:

- state-driven: movement acceleration, jump buffering and cut, coyote time, dash cooldown, beacon range, subsystem-derived speed/jump/invulnerability, and deterministic objective state
- presentation-driven: squash/stretch, facing lean, HUD panels, terrain silhouettes, biome backdrop accents, damage feedback, and route-readability effects

Map-scene readability priorities:

- continuous, legible route edges
- clear selected-route emphasis
- scanner/unlock intel that writes back into node markers instead of living only in side-card copy
- route and notebook detail in stable card regions
- action chips that do not compete with route detail
- generated layouts that feel spatially meaningful instead of flat debug output

## Content-pack direction

Longer term, content packs should define stable, versioned schemas for:

- items
- modules
- hazards
- puzzles
- encounters

That extensibility goal should not outrun the current need for a strong deterministic core loop.
