Discovery date: 2026-03-09

What is wrong or missing:
The run scene still reads flatter than it should. Outside of the map node rotation effect, there are not enough depth cues or faux-3D presentation touches to make traversal feel dimensional.

How to reproduce or observe it:
Play through several run segments and compare the screen feel to the stronger spatial read of the map scene. Watch for how terrain, props, and vehicle motion sit on a mostly flat plane with limited parallax, perspective, or layered motion.

Why it matters:
The prototype is already leaning on movement feel and route readability. If the run scene stays visually flat, it undersells speed, impacts moment-to-moment readability, and makes biome spaces feel less distinct than the project direction suggests.

Known constraints, suspected cause, or likely starting points:
Keep gameplay rules deterministic and avoid pushing simulation logic into rendering. Likely touchpoints are the Pixi presentation and run-scene view code in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts) plus the runtime rendering helpers under [src/game/runtime](/Users/akofink/dev/repos/deeper-trail/src/game/runtime).

Resolution note (2026-03-10):
Closed by moving run-scene depth geometry into a deterministic runtime helper that now drives layered parallax ridge bands, biome-specific silhouette props, and speed-linked motion trails. The Pixi shell renders those cues without changing simulation rules, and targeted tests cover the depth-view model across biome and pace variants.
