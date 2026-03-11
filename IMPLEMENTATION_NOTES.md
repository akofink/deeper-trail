# NOTES FOR IMPLEMENTATION (practical)

## Why PixiJS

- Very fast 2D WebGL
- Simple sprite + container model
- Works great with texture atlases
- Minimal overhead

## Deterministic RNG options

- `seedrandom` (easy)
- Implement `xorshift32` or `xoroshiro128**` (better)
- Keep RNG in `engine/rng` and forbid `Math.random()` in sim/gen.

## Keep UI simple

- Use DOM UI for menus + inventory (React optional)
- Use Pixi for world + vehicle render
- Hybrid approach keeps iteration speed high

## Current practical UI guidance

- The game is currently leaning into in-canvas Pixi HUD panels for moment-to-moment play rather than separate DOM overlays.
- Prefer short labeled panels, chips, bars, and pips over sentence-heavy HUD text.
- If a meter is ambiguous in playtests, add either a label or a numeric readout before adding more explanatory prose.
- Windowed play matters; test non-fullscreen layouts as a default case.
- For map UX specifically:
  - avoid decorative treatments that interrupt route readability,
  - keep route details in a stable card region,
  - let exploration write back into the map so biome benefits/risks become navigational memory rather than off-screen knowledge,
  - treat bottom control chips as secondary actions, not the main source of route context,
  - keep status/message banners compact on the run scene so they do not hollow out the active play area.
- For all in-canvas UI:
  - text-bearing cards should size from measured text content plus padding, not fixed guessed widths/heights,
  - if a string can change at runtime, enforce wrap width explicitly before positioning the card,
  - footer action chips should each own their own centered label; never lay one long sentence across multiple chip backgrounds.
- For biome-specific run objectives:
  - objective rules should live in deterministic sim helpers rather than being embedded entirely in the render/input layer,
  - if a beacon/objective has special activation constraints, surface that rule both on the map route card and in the in-run prompt before the player fails it,
  - biome variation should prefer changing the player's verbs or timing requirements over just changing colors or hazard spacing,
  - synthesized expedition-goal payoff should mutate more than one target when possible; a pre-linked relay alone is too small to read as a mystery payoff,
  - scanner route intel should unlock in readable tiers instead of dumping every route detail from the start:
  - lv.2 reveals biome benefits on unvisited routes,
  - lv.3 reveals biome objective patterns on unvisited routes and completes the scanner's route-reading loop alongside auto-link,
  - lv.4 reveals biome wear-risk previews on unvisited routes,
  - once a biome has been visited, its objective pattern should stay visible even without later scanner upgrades because that knowledge is now experiential,
  - current relay rule set is a good baseline pattern:
  - `town` uses steady relay links plus service bays that reward grounded low-speed holding,
  - `ruin` uses ordered links plus impact plates that reward hard landings on marked slabs,
  - `nature` uses airborne links plus canopy lifts that reward sustained jump control in vertical draft zones,
  - `anomaly` uses boost-linked relays gated by deterministic sync windows plus fly-through sync gates,
  - scanner lv.2+ should make anomaly timing more legible by exposing deterministic phase-lock progress, while lv.3+ can cash that lock out via auto-link instead of just wider range.

## Current modularity guidance

- `main.ts` is still the Pixi app shell, but runtime state types, deterministic run layout data, and derived vehicle stat formulas should continue moving into `src/game/runtime/*` or `src/engine/sim/*` instead of accreting inline.
- Node-completion and post-travel side effects now belong in dedicated runtime helpers (`game/runtime/expeditionFlow.ts`) so the full core loop can be regression-tested without driving the Pixi shell.
- Prompt-priority, compact objective labels, and aggregate objective progress now belong in `game/runtime/runObjectiveUi.ts` so run-scene objective messaging stays testable outside Pixi.
- Per-frame objective mutation now belongs in `game/runtime/runObjectiveUpdates.ts` so service-bay/sync-gate/canopy-lift/impact-plate advancement can be tested without the render loop.
- Objective visual-emphasis state now belongs in `game/runtime/runObjectiveVisuals.ts` so draw-pass special cases can consume precomputed labels/highlights instead of rebuilding those decisions inline.
- Map-scene route/detail/notebook text assembly now belongs in `game/runtime/mapSceneContent.ts` so the map renderer can focus on layout/drawing instead of building long dynamic copy blocks inline.
- Map-board projection/emphasis state now belongs in `game/runtime/mapBoardView.ts` so selected routes, goal rings, and chip labels can be regression-tested without Pixi drawing calls.
- Map-scene card/footer placement now belongs in `game/runtime/mapSceneLayout.ts` so text-card positioning is derived from measured content instead of repeated inline coordinates.
- Map-scene card measurement/planning now belongs in `game/runtime/mapSceneCards.ts` so the Pixi shell asks one helper for measured route/notes/celebration card layout instead of rebuilding temporary wrap-width specs and final placement inline.
- Shared text-card specs and measured card geometry now belong in `game/runtime/sceneTextCards.ts` so run/map overlay cards share one deterministic wrap-width and placement path instead of duplicating card math in `main.ts`.
- Shared text-view placement and style descriptors now belong in `game/runtime/sceneTextView.ts` so chip labels, HUD rows, panel headers, module labels, relay labels, and text-card text state can be regression-tested without mutating Pixi `Text` objects inline.
- Measured batch placement for repeated chip-label, HUD-row, stacked-header, and centered-beacon text now also belongs in `game/runtime/sceneTextView.ts` so `main.ts` only measures/applies Pixi text nodes instead of rebuilding the same placement loops scene-by-scene.
- Map-scene HUD row/header/module-label assembly now belongs in `game/runtime/mapSceneHudView.ts` so the Pixi shell can consume a single map HUD view model instead of rebuilding label positions inline.
- Final measured map-scene HUD/header/chip text placement now belongs in `game/runtime/mapSceneTextAssembly.ts` so `main.ts` only supplies Pixi text measurement/application rather than rebuilding per-label placement loops inline.
- Scene HUD title/meta/row-label content now belongs in `game/runtime/sceneHudContent.ts` so map/run panel copy can be regression-tested without spinning up Pixi text nodes.
- Shared HUD header, module-label placement, and module-meter cell geometry now belongs in `game/runtime/sceneHudView.ts` so panel text anchors and subsystem level/condition grids stay consistent across scenes.
- Shared footer chip-row composition now belongs in `game/runtime/sceneActionChips.ts` so run/map controls can share deterministic spacing and compact cleanly on narrower widths instead of hard-coding scene-local x positions.
- Run-scene overlay banners and footer chip copy now belong in `game/runtime/runSceneView.ts` so prompt priority and control labels can be regression-tested without Pixi draw calls.
- Final measured run-scene HUD/beacon/chip text placement now belongs in `game/runtime/runSceneTextAssembly.ts` so the shell applies one scene-level text plan instead of duplicating row/value/chip measurement code inline.
- Exit-lock and post-run completion message assembly now belongs in `game/runtime/runCompletion.ts` so run-resolution copy can be regression-tested without stepping the Pixi shell.
- World-node helper lookups belong in deterministic helpers (`engine/sim/world.ts`) so map travel, route cards, and automation all read the same node/neighbor logic.

## Current practical world-render guidance

- Even before gameplay terrain becomes mechanically rich, the run scene should have layered visual terrain so the player does not feel stranded in empty space.
- Biome differentiation should come from palette, skyline/backdrop shapes, and repeated terrain motifs, not just hazard color swaps.
- The player avatar should read as rider + machine. If a render pass can be mistaken for a lone creature, add chassis/wheels/tools/modules before adding more abstract motion polish.
- 2.5D projection techniques are now part of the visual toolbox: the route board uses a depth-aware 3D node cloud projected into the 2D map scene, and similar tricks are worth revisiting later for other readable, simulation-safe presentation layers.

## Deployment

- Vite build → static hosting (GitHub Pages / Cloudflare Pages / Netlify)
- No backend required
