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

- `scanner` lv.3 enables relay auto-linking.
- `scanner` lv.2 previews biome benefits on the route board; lv.4 previews hazard strain as well.
- `storage` lv.2 starts pulling nearby salvage pickups inward; lv.3 also increases scrap gained per pickup.
- `shielding` lv.2 grants one rechargeable shielded hit each run.

## Visual persistence

Each module changes the sprite. The vehicle is a “build showcase.”
