# ARCHITECTURE.md (top-level)

## Project goals
- Deterministic simulation (seeded)
- Fast 2D rendering
- Modular content packs
- Clean separation: game state vs rendering
- Easy to add new modules/biomes/puzzles

## Suggested repo layout
src/
  engine/
    rng/                # seeded RNG + utilities
    ecs/                # (optional) simple ECS
    sim/                # deterministic simulation + rules
    gen/                # world + puzzle generation
    data/               # content packs
  game/
    state/              # game state machine (menus, travel, encounter)
    ui/                 # UI components
    scenes/             # Pixi scenes
  assets/
    sprites/
    audio/
docs/

## Determinism rules
- All randomness goes through RNG seeded at run start
- Rendering reads state; it does not mutate state
- Inputs are logged for replay/debugging

## Current runtime split
- `engine/sim/*` owns deterministic rules for travel, vehicle wear/repair/install, biome exploration knowledge, run-objective rules, and resource changes.
- `main.ts` currently owns rendering plus input handling for the run and map scenes.
- Run-scene feel is intentionally partly state-driven and partly presentation-driven:
  - State-driven: movement acceleration, jump buffering/cut, coyote time, dash cooldown, beacon range, subsystem-derived speed/jump/invulnerability.
  - Presentation-driven: squash/stretch, facing lean, HUD panels, terrain silhouettes, biome backdrop accents, and relay/readability effects.

## UI / rendering direction
- Favor compact visual HUD panels over long status strings.
- Every persistent meter should be identifiable by position, label, and color, not color alone.
- Scene composition should keep the playable band visually dense; empty vertical space should be justified by atmosphere or skyline treatment.
- Terrain can begin as non-colliding visual structure, but should still communicate biome and movement context.
- The map scene should read like a navigable route board, not a raw graph debug view:
  - edges should be continuous and legible,
  - selected routes should be visually singled out,
  - route/install/travel details should live in a dedicated readable card rather than loose bottom text,
  - action chips should be spatially separate from the detail card so the two layers do not compete.

## Content packs
Define a schema for:
- items
- modules
- hazards
- puzzles
- encounters
Each has stable IDs and versioning.
