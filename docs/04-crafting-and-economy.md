# docs/04-crafting-and-economy.md

## Materials (high-level categories)
- Metals: scrap, alloy, conductive, hardened
- Electronics: wiring, chips, optics, sensors
- Energy: fuel cells, batteries, capacitors
- Synthetics: polymers, fabrics, seals
- Bio: resins, fibers, catalysts
- Relics: anomalous fragments (puzzle + tech)

## Crafting tiers
1. **Raw salvage**
2. **Components** (bearings, coils, lenses, seals)
3. **Modules** (subsystem upgrades)
4. **Integrations** (synergy sets / special interactions)

## Recipe discovery (important!)
You don’t start with recipes.
You discover:
- Schematics (in ruins, trades, puzzles)
- Reverse-engineering (requires tools/sensors)
- “Fabrication language” (late game, universal crafting grammar)

## Economy (avoid grind)
- Keep inventory small and meaningful
- Scarcity creates choices, not chores
- “Worthwhile scrap” is intentionally rare

## Repair loop
Damage creates tension:
- Temporary field repair (cheap, imperfect)
- Proper workshop repair (restores integrity)
- “Scars” remain as narrative (optional cosmetic persistence)

## Current prototype hook
- Non-town map nodes still use a cheap field repair that restores one damaged subsystem pip.
- `town` nodes now act as workshops: the map repair action restores all missing subsystem condition at a scrap cost equal to total missing integrity.
- If the vehicle is already mechanically pristine, the same map action still falls through to the existing med-patch hull heal when available.
