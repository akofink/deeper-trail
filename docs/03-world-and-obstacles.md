# docs/03-world-and-obstacles.md

## World structure: node graph + layers
Use a procedural graph of nodes:
- Towns, ruins, nature, anomalies, tradeposts, gates
Edges have traits:
- Distance, difficulty, hazard types, faction control, secret paths

As the game deepens, new layers overlay the same structure:
- Road layer → wilderness layer → orbital layer → system layer

## Obstacle taxonomy (designed to require upgrades)
### Environmental
- Mud, sand, snow, ice
- Heat/cold extremes
- Dust storms (intake filters)
- Flooded routes (buoyancy)
- Radiation belts (shielding)
- Low pressure / vacuum (sealed systems)

### Mechanical / resource
- Fuel scarcity → efficiency upgrades
- Breakdown frequency → redundancy
- Weight limits → frame reinforcement
- Heat management → cooling systems
- Power spikes → capacitors

### Social / faction
- Toll gates, inspections
- Reputation-based access to parts
- Smuggling routes (hidden compartments)
- Negotiation puzzles (communication module)

### Puzzle gates (escape room vibes)
- Symbol locks that require sensor readouts
- Circuit puzzles requiring tools + components
- Alignment / calibration tasks (timing, order)
- “Language” puzzles using discovered lexicon fragments
- Multi-location puzzles (collect pieces across regions)

## Hard rule
Obstacles must be solvable by:
- Building the right capability
- Clever route planning
- Interpreting clues correctly
Not by grinding stats.
