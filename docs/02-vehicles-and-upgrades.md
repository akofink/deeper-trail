# docs/02-vehicles-and-upgrades.md

## Vehicle philosophy

The “vehicle” is a persistent object with modular subsystems.  
You never discard it; you **refactor it** into new forms.

## Core subsystems (v1)

- **Frame / Chassis**: mount points, durability, weight, form factor
- **Mobility**: wheels / treads / legs / hover / sail
- **Power**: human, combustion, electric, solar, exotic
- **Drive / Propulsion**: torque profiles, acceleration, climb capacity
- **Control**: stability, autopilot, fine maneuvers
- **Sensors**: map reveal, anomaly detection, puzzle inputs
- **Storage**: cargo, hidden compartments, fragile slots
- **Tools**: cutter, winch, crane arm, drill, welder, probe
- **Shielding**: weather, radiation, heat, EM, pressure
- **Crew / Hab** (later): fatigue, health, cognition bonuses

## Upgrade pattern: capability + tradeoff

Every module should:

- Unlock a verb or interaction
- Introduce constraints (weight, power draw, fragility, heat, attention)

## Example module lines

### Mobility

- Road Tires → All-terrain → Studded/Ice → Treads → Hover Pads
- Climb Kit (adds winch + anchors) but reduces top speed

### Power

- Dynamo Hub (bike) → Battery Pack → Solar Sheet → Reactor Core
- Capacitor Bank (burst power) but risky overheating

### Sensors

- Compass + Paper Map → Radar Ping → Spectral Lens → Pattern Decoder
- Deeper scan reveals more secrets but increases anomaly encounters

### Tools

- Hand Tools → Portable Welder → Fabricator Nozzle → Matter Shaper
- Precision tools enable puzzle interactions (wiring, alignment, decoding)

### Current prototype hooks

- Map biome sites now expose a small deterministic install rack instead of one implicit upgrade; use Left/Right on the map to choose which site module to install before pressing `C`.
- Route cards now preview biome-arrival build synergies so route choice can key off the current machine:
  - `town` + engine lv.2 adds +4 arrival fuel
  - `ruin` + storage lv.2 adds +1 arrival scrap
  - `nature` + suspension lv.2 repairs 1 damaged module condition on arrival
  - `anomaly` + scanner lv.2 permanently reveals connected-route intel on arrival
- `scanner` lv.3 enables relay auto-linking.
- `scanner` lv.2 previews biome benefits directly on route-board nodes and can phase-lock anomaly relays during open sync windows; lv.3 adds objective-pattern markers and auto-linking; lv.4 adds subsystem-specific hazard-strain markers plus explicit route-card hazard previews.
- `storage` lv.2 starts pulling nearby salvage pickups inward; lv.3 also increases scrap gained per pickup.
- `shielding` lv.2 grants one rechargeable shielded hit each run.
- Biome-aligned subsystems now also ease their matching run objective in deterministic ways:
  - `engine` shortens town service-bay hold time
  - `frame` lowers the ruin impact-plate slam threshold
  - `suspension` shortens the airborne hold needed to chart nature canopy lifts
  - `shielding` lowers the speed / boost threshold needed to stabilize anomaly sync gates

## Visual persistence

Each module changes the sprite. The vehicle is a “build showcase.”
