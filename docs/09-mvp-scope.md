# Current Roadmap

This file is the active scope checkpoint for the prototype. It replaces the earlier short-horizon MVP framing with a roadmap that matches the current codebase.

## The baseline that already exists

The project already has a real playable slice:

- seeded node graph travel
- compact route-board map presentation
- persistent subsystem levels and condition
- repair and install actions on the map scene
- biome-specific run objectives for `town`, `ruin`, `nature`, and `anomaly`
- lightweight notebook clue progression and expedition-goal variants
- deterministic share codes, engine tests, and browser automation hooks

The roadmap is no longer "build an MVP from zero." It is "turn this slice into a coherent, scalable foundation."

## Current priorities

### 1. Strengthen the expedition loop

- ensure travel, run objectives, upgrades, route intel, and notebook payoffs read as one journey
- deepen route consequences so clue order and node choice matter mechanically
- keep map and run feedback compact, legible, and useful in normal windowed play

### 2. Finish the shell split

- continue moving orchestration and dynamic copy out of `src/main.ts`
- keep deterministic rules in `src/engine/*`
- keep runtime assembly and view-model logic in `src/game/runtime/*`
- keep rendering code focused on presentation, not gameplay rules

### 3. Harden determinism and coverage

- preserve seed-stable outcomes across route selection, objective logic, upgrades, and mystery payoffs
- expand regression coverage for full expedition flows and route-specific objective variants
- keep browser automation hooks reliable for smoke checks

## Next milestones

### Milestone A: Coherent local expedition

Success looks like:

- a full run from route choice to route clear to meaningful map consequence feels intentional
- each biome advertises a distinct verb pattern
- the notebook meaningfully helps the player read the board
- upgrade decisions are about capabilities and tradeoffs, not only throughput

### Milestone B: Strong mystery payoff

Success looks like:

- clue discovery changes more than end-card text
- expedition-goal approaches, arrivals, and aftermath differ in noticeable deterministic ways
- the player can explain why one seed or route sequence felt special

### Milestone C: Ready for broader scale

Success looks like:

- the current local loop is stable, testable, and readable enough to support larger travel layers
- `src/main.ts` is mostly orchestration instead of mixed rule/UI logic
- design docs and architecture docs still describe the code truthfully

## Explicitly deferred

- combat-heavy progression
- large crew simulation
- broad inventory sprawl
- server-backed features
- large-scale content-pack work before the core loop is stable
- expansion into bigger travel scales before the current expedition loop consistently lands

## Roadmap check questions

Before pulling new work forward, ask:

- does this improve the current expedition loop or only add surface area?
- does this help the long-term promise of one evolving machine and a deepening route mystery?
- is the current local loop strong enough that a larger-scale version would benefit from being added now?
