# docs/05-procedural-generation.md

## Deterministic seeds
Everything derives from a seed:
- World graph
- Biome types and hazards
- Faction map
- Encounter tables
- Puzzle permutations
- Item placement and rarity

## Design goals
- Players can share seeds
- Runs are comparable and discussable
- Procedural content still supports authored “beats”

## Approach
Hybrid generation:
- A small number of authored “macro arcs” (mystery beats)
- Procedural filler nodes between beats
- Constraints ensure beats can be discovered in multiple orders

## Example: mystery beat constraints
- Beat A requires: Sensor Tier 1 + Tool Tier 1
- Beat B requires: Shielding Tier 2 OR alternative route unlocked by faction
- Beat C requires: Lexicon fragments from 3 different regions

## Avoiding nonsense worlds
Use “rules of plausibility”:
- Hazard distributions by biome
- Faction territories contiguous
- Trade hubs along major routes
- Rare anomalies not clustered too early unless seed special
