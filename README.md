# WORKING TITLE: DEEPER TRAIL

A serverless, high-performance, 2D browser game where the player begins with almost nothing (a bicycle and a vague directive) and is gradually pulled into a widening, stranger journey that can plausibly end in **starships, alien environments, and a meta-puzzle** that keeps unfolding.

The core hook: **you never “buy a new vehicle.”** You **evolve one thing into another** through granular component upgrades and discovered fabrication methods. The “bicycle → rover → skiff → ship” progression is not a menu choice; it emerges from _what the world teaches you to build_.

---

## Why this exists

- **Browser-first, serverless**: runs locally; deploy to static hosting.
- **2D only**: pixel or vector; no 3D.
- **High replayability**: procedural generation + combinatorial systems.
- **Shareable moments**: surprising outcomes, codes, “seeds,” and puzzles that players trade.

---

## Tech stack recommendation (serverless)

**TypeScript + Vite + PixiJS** (WebGL 2D renderer)

- PixiJS for fast 2D rendering with modest hardware.
- Vite for instant dev + static build.
- Pure client-side deterministic generation (seeded RNG).
- Optional: Web Audio API for sound.

Alternative: **Phaser 3** also great. If you prefer a more “batteries included” game framework, swap Pixi for Phaser. This repo structure assumes Pixi.

---

## Core pillars (design constraints)

1. **One journey, many scales**  
   The world expands from local roads to continents to orbital routes to interstellar paths — without breaking the 2D format.

2. **Vehicle identity through modules**  
   Granular upgrades to subsystems create distinct builds and emergent solutions.

3. **Obstacles require capabilities, not stats**  
   Challenges are environmental/systemic/social/puzzle-based; upgrades unlock new _verbs_.

4. **A meta-puzzle that deepens**  
   Escape-room vibes: codes, diagrams, patterns, artifacts. Each layer reveals another layer.

5. **Infinite variation**  
   Procedural regions, encounters, crafting recipes, and puzzle permutations are deterministic by seed.

---

## The “Deeper” loop (player experience)

**Minute 1:** “I’m on a bike with a bag.”  
**Hour 2:** “I have a welded dyno hub, better tires, and a weird lens I found.”  
**Hour 8:** “I built a crawler frame from scrapyard parts.”  
**Hour 20:** “I found a fabrication language and can assemble alien-grade modules.”  
**Hour 40+:** “I’m navigating systems. The symbols match the early road signs. Wait….”

---

## Split docs

- [README.md](docs/README.md)
- [00-vision.md](docs/00-vision.md)
- [01-core-loop.md](docs/01-core-loop.md)
- [02-vehicles-and-upgrades.md](docs/02-vehicles-and-upgrades.md)
- [03-world-and-obstacles.md](docs/03-world-and-obstacles.md)
- [04-crafting-and-economy.md](docs/04-crafting-and-economy.md)
- [05-procedural-generation.md](docs/05-procedural-generation.md)
- [06-puzzles-and-meta-mystery.md](docs/06-puzzles-and-meta-mystery.md)
- [07-content-packs.md](docs/07-content-packs.md)
- [08-sharing-and-seeds.md](docs/08-sharing-and-seeds.md)
- [09-mvp-scope.md](docs/09-mvp-scope.md)
- [10-engineering-workflow.md](docs/10-engineering-workflow.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [FEATURE_LIST.md](FEATURE_LIST.md)
- [QUICK_PITCHES.md](QUICK_PITCHES.md)
- [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)

---

## Development setup

- Install dependencies: `npm install`
- Start the game shell: `npm run dev`
- Run quality gates: `npm run check`

## GitHub Pages deployment

- This repo is configured for GitHub Pages deployment from GitHub Actions.
- The workflow lives at [.github/workflows/deploy-pages.yml](/home/akofink/dev/repos/deeper-trail/.github/workflows/deploy-pages.yml).
- Production builds now use relative asset paths so the same `dist/` artifact works both on the GitHub Pages project URL and on the custom domain root.
- In GitHub repo settings, set Pages to use `GitHub Actions` as the source.
- After pushes to `main`, the site will deploy to GitHub Pages and can be served from `https://akofink.github.io/deeper-trail/` or the configured custom domain `https://deeper-trail.akofink.com/`.

## Current code structure

```
src/
  engine/
    data/      # content pack types + validation
    gen/       # deterministic graph generation
    rng/       # seeded RNG utilities
    sim/       # simulation actions/rules
  game/
    scenes/    # rendering scenes (placeholder)
    state/     # game state and initialization
    ui/        # UI modules (placeholder)
tests/         # unit tests for engine + state behavior
```

## Quality and contribution rules

- Feature changes must include tests for behavior and edge cases.
- Bug fixes must include a reproducing test that fails before the fix.
- Keep docs updated when workflows, architecture, or behavior changes.
- See `CONTRIBUTING.md` and `docs/10-engineering-workflow.md`.
