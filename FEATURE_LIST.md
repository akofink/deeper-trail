# DEEPER TRAIL ROADMAP

## Current state
- [x] Seeded deterministic world generation with reproducible per-expedition seeds
- [x] World map travel between connected nodes with fuel costs and free-travel charges
- [x] Vehicle subsystem progression across frame, engine, scanner, suspension, storage, and shielding
- [x] Scrap economy with field repair, site installs, and med-patch fallback healing
- [x] Run scene with movement, jump buffering, coyote time, dash boost, hazards, salvage, and exit objective
- [x] Biome-aware map intel with visited/completed state and discovered benefits/risks
- [x] Expedition goal node and explicit macro completion state
- [x] First biome-specific objective rules:
  - ruin nodes require ordered relay linking
  - anomaly nodes require boosted/high-momentum relay linking

## Highest-priority gaps
- [ ] Add one lightweight mystery/notebook layer so node completion yields clues, not just resources
- [ ] Add one more biome-specific objective/puzzle template so runs vary beyond relay rules
- [ ] Cover a full node-completion-and-travel loop with deterministic automation
- [ ] Break more simulation rules out of `src/main.ts` into testable engine modules

## Playability / fun priorities
- [ ] Add pickup magnetism or storage-driven salvage pull so collection runs feel juicier
- [ ] Add chassis-led terrain response: landing compression, wheel kick, dust/trail feedback
- [ ] Make scanner progression reveal more route intel before arrival, not only after discovery
- [ ] Tune anomaly/ruin objective difficulty from human playtest feedback

## Content / progression priorities
- [ ] Add a 3-beat mini mystery arc tied to specific node/biome discoveries
- [ ] Add at least one authored encounter/event outcome on arrival to break pure traversal rhythm
- [ ] Add one more node-site decision so installs are occasionally a choice, not always deterministic

## Lower-priority later work
- [ ] Share/export seed + build summary
- [ ] Broader encounter table system
- [ ] Additional puzzle templates and longer mystery arcs
