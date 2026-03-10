Discovery date: 2026-03-09

What is wrong or missing:
Level layouts read as too flat despite the run scene having stronger platformer feel than earlier builds.

How to reproduce or observe it:
Play several biome segments in sequence and compare the terrain profile and jump/use of elevation across encounters.

Why it matters:
The current terrain underuses the movement feel the prototype already has, making traversal less expressive and reducing biome distinctiveness.

Known constraints, suspected cause, or likely starting points:
Check level or obstacle generation hooks that shape terrain silhouettes and jump opportunities. Likely touchpoints are the deterministic generation and simulation modules under [src/engine](/Users/akofink/dev/repos/deeper-trail/src/engine) plus any run-scene presentation glue in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts).

Resolution note (2026-03-10):
Closed by adding a deterministic per-biome encounter rise profile that lifts pickups, beacons, canopy lifts, sync gates, and matching terrain shelves so runs read with stronger elevation beats without changing flat-ground collision rules.
