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
  - current relay rule set is a good baseline pattern:
  - `town` uses steady relay links plus service bays that reward grounded low-speed holding,
  - `ruin` uses ordered links,
  - `nature` uses airborne links plus canopy lifts that reward sustained jump control in vertical draft zones,
  - `anomaly` uses boost-linked relays gated by deterministic sync windows plus fly-through sync gates.

## Current modularity guidance

- `main.ts` is still the Pixi app shell, but runtime state types, deterministic run layout data, and derived vehicle stat formulas should continue moving into `src/game/runtime/*` or `src/engine/sim/*` instead of accreting inline.
- World-node helper lookups belong in deterministic helpers (`engine/sim/world.ts`) so map travel, route cards, and automation all read the same node/neighbor logic.

## Current practical world-render guidance

- Even before gameplay terrain becomes mechanically rich, the run scene should have layered visual terrain so the player does not feel stranded in empty space.
- Biome differentiation should come from palette, skyline/backdrop shapes, and repeated terrain motifs, not just hazard color swaps.
- The player avatar should read as rider + machine. If a render pass can be mistaken for a lone creature, add chassis/wheels/tools/modules before adding more abstract motion polish.
- 2.5D projection techniques are now part of the visual toolbox: the route board uses a depth-aware 3D node cloud projected into the 2D map scene, and similar tricks are worth revisiting later for other readable, simulation-safe presentation layers.

## Deployment

- Vite build → static hosting (GitHub Pages / Cloudflare Pages / Netlify)
- No backend required
