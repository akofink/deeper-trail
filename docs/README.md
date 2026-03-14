# Documentation Map

This directory is the design and planning backbone for Deeper Trail. The goal is to keep one clear through-line:

- the long-term vision is a deterministic journey game that starts grounded and becomes stranger over time
- the current prototype is a local expedition loop with seeded map travel, biome-specific run objectives, modular upgrades, and a small notebook mystery
- the roadmap should strengthen that loop before broadening scope

## Read this first

1. [00-vision.md](/Users/akofink/dev/repos/deeper-trail/docs/00-vision.md)
2. [01-core-loop.md](/Users/akofink/dev/repos/deeper-trail/docs/01-core-loop.md)
3. [09-mvp-scope.md](/Users/akofink/dev/repos/deeper-trail/docs/09-mvp-scope.md)
4. [ARCHITECTURE.md](/Users/akofink/dev/repos/deeper-trail/ARCHITECTURE.md)

Those four files should stay aligned. If one changes materially, check the others in the same pass.

## Current roadmap snapshot

`Current baseline`
- seeded node travel on a readable route-board map
- deterministic biome-specific run objectives
- persistent subsystem level and condition progression
- repair/install loops tied to route outcomes
- lightweight notebook clues and share-code support

`Current focus`
- make the expedition loop read as one coherent journey instead of adjacent prototype systems
- keep the browser shell split clean so bootstrap-session assembly, runtime-session ownership, runtime-factory wiring, and render helpers stay testable and isolated
- improve payoffs, route consequences, and readability before adding much broader scope

`Deferred expansion`
- factions/trade depth
- larger world-scale travel layers
- heavier fabrication language systems
- broader content-pack/modding ambitions

## Doc guide

- [00-vision.md](/Users/akofink/dev/repos/deeper-trail/docs/00-vision.md): project promise, pillars, non-goals, and player-facing fantasy
- [01-core-loop.md](/Users/akofink/dev/repos/deeper-trail/docs/01-core-loop.md): what the player is doing now, what that loop should become, and how scale expands
- [02-vehicles-and-upgrades.md](/Users/akofink/dev/repos/deeper-trail/docs/02-vehicles-and-upgrades.md): subsystem philosophy, capability progression, and module examples
- [03-world-and-obstacles.md](/Users/akofink/dev/repos/deeper-trail/docs/03-world-and-obstacles.md): node graph structure, obstacle categories, and route-planning principles
- [04-crafting-and-economy.md](/Users/akofink/dev/repos/deeper-trail/docs/04-crafting-and-economy.md): salvage, recipes, repair, and economy guardrails
- [05-procedural-generation.md](/Users/akofink/dev/repos/deeper-trail/docs/05-procedural-generation.md): deterministic generation goals and authored-beat constraints
- [06-puzzles-and-meta-mystery.md](/Users/akofink/dev/repos/deeper-trail/docs/06-puzzles-and-meta-mystery.md): puzzle philosophy, notebook/mystery direction, and current clue-system status
- [07-content-packs.md](/Users/akofink/dev/repos/deeper-trail/docs/07-content-packs.md): long-range extensibility goals
- [08-sharing-and-seeds.md](/Users/akofink/dev/repos/deeper-trail/docs/08-sharing-and-seeds.md): share artifacts and deterministic code format
- [09-mvp-scope.md](/Users/akofink/dev/repos/deeper-trail/docs/09-mvp-scope.md): the active roadmap and scope boundaries
- [10-engineering-workflow.md](/Users/akofink/dev/repos/deeper-trail/docs/10-engineering-workflow.md): workflow and quality gates

## Supporting references

- [README.md](/Users/akofink/dev/repos/deeper-trail/README.md): repo entry point and concise project framing
- [ARCHITECTURE.md](/Users/akofink/dev/repos/deeper-trail/ARCHITECTURE.md): current runtime and rendering split
- [IMPLEMENTATION_NOTES.md](/Users/akofink/dev/repos/deeper-trail/IMPLEMENTATION_NOTES.md): practical implementation guidance and constraints
- [progress.md](/Users/akofink/dev/repos/deeper-trail/progress.md): implementation history
- [docs/issues](/Users/akofink/dev/repos/deeper-trail/docs/issues): concrete open issues and handoff notes
