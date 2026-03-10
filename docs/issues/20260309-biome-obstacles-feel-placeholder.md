Discovery date: 2026-03-09

What is wrong or missing:
Biome obstacles still feel like placeholders, with limited variety in obstacle behavior, enemy movement patterns, and capability-testing encounters.

How to reproduce or observe it:
Play across multiple generated biomes and compare the obstacle silhouettes, behaviors, and the types of movement responses they demand.

Why it matters:
Low obstacle variety weakens replayability and blurs the capability-driven progression the project is supposed to build toward.

Known constraints, suspected cause, or likely starting points:
Look at biome generation and obstacle/enemy rule definitions under [src/engine](/Users/akofink/dev/repos/deeper-trail/src/engine). Preserve deterministic generation while expanding the obstacle set and movement-pattern vocabulary.
