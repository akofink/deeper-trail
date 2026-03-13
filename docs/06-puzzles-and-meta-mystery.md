# docs/06-puzzles-and-meta-mystery.md

## Puzzle philosophy

Puzzles are:

- Mechanical (vehicle/tool interaction)
- Symbolic (language, patterns)
- Spatial (routes, node ordering)
- Systemic (resource + capability constraints)
- Meta (cross-run hints optional)

## Puzzle layers

### Layer 1: Local locks

- Simple code wheels, alignments, circuit bridges

### Layer 2: Pattern recognition

- Constellation-like maps
- Road signs that later match star charts
- Repeating motifs across scales

### Layer 3: Fabrication language

- Discover a grammar that encodes recipes and truths
- Building becomes “writing” in a language

### Layer 4: The Premise

A question that pulls inward, e.g.:

- “Why does the world keep folding into larger scales?”
- “Who built the routes?”
- “Why is your vehicle the only persistent object across layers?”
- “Why do early symbols match late star maps?”

## Meta-mystery structure

Use a “mystery graph”:

- Nodes = revelations
- Edges = requirements (capabilities + clue sets)
- Multiple endings = different traversal outcomes

## Sharing hooks

- In-game notebook that exports “clue cards”
- Optional “puzzle share codes” (short strings)

## Current prototype status

- The game now has a lightweight deterministic notebook layer.
- Town runs now use a simple positioning puzzle set: settle beside relays at low speed and hold steady inside marked service bays.
- Ruin runs now add impact plates: marked stone slabs that only crack when the vehicle lands hard enough to register an excavation strike.
- Nature runs now add canopy lifts: vertical draft blooms that must be charted by staying airborne through deterministic gust windows long enough to stabilize the route.
- Anomaly runs now add sync gates: phase-timed fields that stabilize only when the player cuts through them with enough speed or boost.
- Completing the first `ruin`, `nature`, and `anomaly` runs logs one seed-stable clue each.
- Finding all three clue families auto-adds a synthesis note so the expedition reads like a small mystery arc rather than isolated route clears.
- First arrivals now also include a small authored beat layer:
  - scanned ruins can reveal an alignment cache for extra salvage,
  - notebook-aware towns can bank a free transfer,
  - synthesized town arrivals can annotate the connected board with adjacent biome benefits, risks, and objective patterns,
  - nature clues can turn groves into stronger recovery stops,
  - synthesized anomaly arrivals can stabilize a phase corridor into a free transfer.
- Notebook progress now feeds back into route choice mechanically:
  - first clue enables signal-bearing reads on the selected route,
  - second clue adds estimated remaining leg count to the source,
  - synthesis marks the strongest currently connected lead on the route board and decodes that lead's arrival profile before travel.
- Synthesized approaches to the expedition goal now also alter the local run:
  - the map route card now previews a seed-stable source profile instead of a generic synthesis warning,
  - the first discovered core clue decides which source relay starts pre-linked,
  - the second discovered core clue decides the arrival bonus at the goal node,
  - the ordered pair formed by the first and second clues now selects a deterministic source-signature variant, such as a breached entry, quieter moving hazards, extra salvage echoes, or a shortened final approach,
  - the third discovered core clue decides a run-layout assist such as a collapsed barrier, easier relay reach, or a primed shield charge,
  - that same third clue now also pre-solves the first local secondary objective on the goal run so synthesis changes more than one verb target,
  - clearing the goal now surfaces that decoded source-signature variant directly in the win banner, completion banner, and post-run celebration card instead of collapsing every successful run into the same generic ending text,
  - each source-signature ending now also carries a distinct discovery beat about what the player actually finds at the signal source, so the clue-order payoff changes the resolved encounter and not only the approach modifiers,
  - the ending now also carries a short signature-specific epilogue line so the expedition resolves as a distinct outcome, not just a distinct approach mutation,
  - the goal encounter is still deterministic and replayable: the same clue order produces the same source signature every run.
- The current notebook is still intentionally lightweight: it is a discovery layer and route-intel aid, not yet a full branching puzzle graph.
