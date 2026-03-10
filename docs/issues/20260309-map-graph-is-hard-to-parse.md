Discovery date: 2026-03-09

What is wrong or missing:
The map currently reads like a confusing point cloud. Even when the intended route is mostly linear, crossing path lines through the center of the map make progression hard to understand.

How to reproduce or observe it:
Open the map during a typical run and try to infer the main route, optional detours, and the relationship between nearby nodes without prior knowledge of the generated graph.

Why it matters:
Map readability is central to the route-board presentation of the game. If players cannot parse the route structure, the seeded world graph loses much of its strategic value.

Known constraints, suspected cause, or likely starting points:
The playtest suggestion points toward district-like local clusters plus a variable number of inter-district links. Start with deterministic graph generation in [src/engine/gen/worldGraph.ts](/Users/akofink/dev/repos/deeper-trail/src/engine/gen/worldGraph.ts) and map rendering/layout logic in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts).
