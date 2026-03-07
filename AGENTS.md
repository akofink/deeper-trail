# AGENTS.md

This repository is a browser-first 2D game prototype built with TypeScript, Vite, PixiJS, and Vitest. Use this file as the default operating guide for AI agents and other contributors working in this repo.

## Project Intent

- Preserve the core direction in [README.md](/home/akofink/dev/repos/deeper-trail/README.md): a deterministic, replayable, serverless journey game that scales from bikes and roads to stranger late-game travel.
- Favor changes that strengthen the game's core pillars: deterministic simulation, modular vehicle progression, capability-driven obstacles, and seed-based replayability.
- Keep the browser build simple. This project is static-host friendly and should remain client-side.

## Stack And Entry Points

- Runtime: Node 20+.
- App shell: Vite.
- Rendering: PixiJS in [src/main.ts](/home/akofink/dev/repos/deeper-trail/src/main.ts).
- Deterministic engine logic lives under [src/engine](/home/akofink/dev/repos/deeper-trail/src/engine).
- Game state lives under [src/game/state](/home/akofink/dev/repos/deeper-trail/src/game/state).
- Tests live under [tests](/home/akofink/dev/repos/deeper-trail/tests).

Current high-value files:

- [src/main.ts](/home/akofink/dev/repos/deeper-trail/src/main.ts): current runtime shell, input handling, HUD/map presentation, and run-scene feel code.
- [src/engine/gen/worldGraph.ts](/home/akofink/dev/repos/deeper-trail/src/engine/gen/worldGraph.ts): seeded world generation.
- [src/engine/rng/seededRng.ts](/home/akofink/dev/repos/deeper-trail/src/engine/rng/seededRng.ts): RNG utilities. New randomness should route through here or closely related deterministic helpers.
- [src/engine/sim](/home/akofink/dev/repos/deeper-trail/src/engine/sim): travel, vehicle, exploration, and objective rules.
- [src/game/state/gameState.ts](/home/akofink/dev/repos/deeper-trail/src/game/state/gameState.ts): initial run state and simulation-facing state shape.

## Non-Negotiable Rules

- Keep simulation deterministic. Identical seeds and inputs must produce identical simulation outcomes.
- Do not put gameplay rules in rendering code when they belong in the engine. Rendering should read state, not define core rules.
- Route random behavior through seeded RNG utilities.
- Keep engine code small, pure, and directly testable where possible.
- Do not add server dependencies or require backend services.
- Update docs when behavior, architecture, or workflow changes.

## Working Style For This Repo

- Start by reading the relevant docs before making broad gameplay or architecture changes.
- Start every code or docs task in a dedicated linked git worktree on its own branch, even for small changes, unless the user explicitly instructs otherwise.
- Before creating a new worktree, inspect existing linked worktrees with `git worktree list` and treat them as active agent context.
- Use existing worktree names, branch names, and branch-local docs updates to infer what work is already in progress so you do not duplicate or collide with another agent's task.
- Prefer small, scoped edits over sweeping rewrites.
- Commit incrementally as you go. Prefer multiple small commits that keep the branch history easy to review over one large end-of-session commit.
- Follow the existing split:
  - `src/engine/*` for deterministic rules and generation.
  - `src/game/state/*` for state shaping and simulation state transitions.
  - `src/main.ts` for rendering and input until the runtime is split further.
- If a change touches both simulation and presentation, keep the rule change in the engine and the visual consequence in the renderer.
- Preserve the current visual direction from [ARCHITECTURE.md](/home/akofink/dev/repos/deeper-trail/ARCHITECTURE.md): compact HUD panels, readable map scene, and strong biome readability.

## Commands

- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm run test`
- Full quality gate: `npm run check`

Before finishing substantial code changes, run `npm run check` when feasible.

## Branch And Worktree Workflow

- Do not work directly in the primary checkout when making repo changes. Create a linked worktree and branch first.
- Start by checking `git worktree list` so you know which branches are already checked out and which task names are already claimed by another worktree.
- Create the branch and worktree together with `git worktree add .worktrees/<task-name> -b <branch-name>`.
- Git does not allow checking out the same branch in multiple worktrees. Pick a fresh branch name for your task rather than trying to reuse a branch that is already active elsewhere.
- Keep one task per branch/worktree so cleanup and review stay simple.
- Read from other agents' worktrees when needed for coordination, but do not write into them. Only edit files inside your own current worktree.
- When choosing new work, use branch/worktree names plus branch-local docs changes such as `docs/issues`, `progress.md`, `IMPLEMENTATION_NOTES.md`, and relevant design docs to avoid taking the same issue another agent is already handling.
- Commit incrementally during the task rather than batching all changes into one final commit.
- When the task is complete, merge the worktree branch back into `main` with a non-interactive git command.
- After the merge, remove the linked worktree and delete the now-merged branch when feasible.
- Before removing a worktree with unfinished work, capture any follow-up items in [docs/issues](/home/akofink/dev/repos/deeper-trail/docs/issues) so nothing is stranded in local history.

## Test Expectations

- Every feature change should add or update tests.
- Every bug fix should add a reproducing test that fails before the fix and passes after.
- Deterministic systems should be tested with seed-stable assertions.
- Prefer targeted unit tests in [tests](/home/akofink/dev/repos/deeper-trail/tests) for engine and state behavior.

Existing test coverage is centered on:

- world generation
- seeded RNG behavior
- travel rules
- vehicle rules
- exploration rules
- run objective rules

## Documentation Hygiene

Keep docs aligned with code in the same change.

Update these files when relevant:

- [ARCHITECTURE.md](/home/akofink/dev/repos/deeper-trail/ARCHITECTURE.md) for foundational module or runtime split changes.
- [docs/10-engineering-workflow.md](/home/akofink/dev/repos/deeper-trail/docs/10-engineering-workflow.md) for changes to quality gates, hooks, or contribution workflow.
- [README.md](/home/akofink/dev/repos/deeper-trail/README.md) for setup, stack, or user-facing project framing changes.
- Design docs under [docs](/home/akofink/dev/repos/deeper-trail/docs) when gameplay systems move materially.
- [IMPLEMENTATION_NOTES.md](/home/akofink/dev/repos/deeper-trail/IMPLEMENTATION_NOTES.md) or [progress.md](/home/akofink/dev/repos/deeper-trail/progress.md) when carrying forward implementation status or follow-up notes.

When you discover follow-up work that should survive the current session, record it in
[docs/issues](/home/akofink/dev/repos/deeper-trail/docs/issues) before handing off. This includes
bugs, UX problems, balancing problems, determinism risks, missing tests, tooling gaps, and design
debt that is concrete enough for another agent to pick up later.

## Docs Triage And Next-Work Order

- Treat [docs/issues](/home/akofink/dev/repos/deeper-trail/docs/issues) as the first stop for follow-on work. This directory is for concrete issue reports, bugs, UX problems, and playtest findings that should be evaluated before broader roadmap work.
- Keep [docs/issues](/home/akofink/dev/repos/deeper-trail/docs/issues) for open, actionable reports. Once an issue is no longer actionable, move it to [docs/issues/closed](/home/akofink/dev/repos/deeper-trail/docs/issues/closed).
- When starting a new task without a more specific user brief, check [docs/issues](/home/akofink/dev/repos/deeper-trail/docs/issues) first and resolve or triage the most relevant current reports before pulling new feature work forward.
- After issue reports, continue from the existing roadmap/design docs under [docs](/home/akofink/dev/repos/deeper-trail/docs). Use those files for planned implementation slices, roadmap continuation, and design evolution.
- Only after issue reports and roadmap continuation are covered should work drift into looser exploration: research, open-ended ideation, wonder, or roadmap extension/refinement.
- Keep the distinction clear when writing docs:
  - `docs/issues/*` = specific observed problems or actionable findings.
  - `docs/issues/closed/*` = reports that have been fixed, intentionally deferred, invalidated, or otherwise closed out.
  - `docs/*.md` numbered design docs = intended direction, roadmap, and system design.
  - [progress.md](/home/akofink/dev/repos/deeper-trail/progress.md) / [IMPLEMENTATION_NOTES.md](/home/akofink/dev/repos/deeper-trail/IMPLEMENTATION_NOTES.md) = implementation history, constraints, and carry-forward notes.
- When closing an issue report, add a short resolution note in the file before moving it so future contributors can see why it stopped being actionable.
- If an issue report changes the roadmap, fix or annotate the issue first, then update the relevant design doc so future contributors see both the immediate problem and the longer-term plan.
- Issue filenames should follow `YYYYMMDD-short-kebab-case-summary.md` so reports sort by discovery date and remain easy to scan.
- Each new open issue should be a short handoff note that covers:
  - what is wrong or missing
  - how to reproduce or observe it
  - why it matters to the project goals or player experience
  - any known constraints, suspected cause, or likely file/module starting points
  - the discovery date so later agents know the report's age
- Create an issue report before ending a session whenever you leave behind known actionable work that you are not fixing in the same change.
- Do not move speculative ideas or broad roadmap brainstorming into [docs/issues](/home/akofink/dev/repos/deeper-trail/docs/issues); keep that material in the numbered design docs or progress notes unless there is a concrete problem to hand off.

## Gameplay And Architecture Guidance

- Vehicle progression should feel like evolving one machine through modules, not swapping to unrelated vehicles through menus.
- Obstacles should unlock through capabilities and verbs, not just numeric stat inflation.
- Procedural content should remain seed-driven and inspectable.
- The map scene should stay readable as a route board, not regress into debug-only graph output.
- Run-scene feel can live partly in presentation, but core movement and subsystem-derived behavior should remain state-driven and explicit.

## Practical Agent Advice

- Read before editing. This repo has compact files, and understanding the surrounding rule set is usually cheap.
- Search with `rg` first.
- During task selection or handoff, check other linked worktrees for branch-local doc changes before assuming an issue is unclaimed. Reading is allowed; editing another worktree is not.
- For quick visual verification, consider direct browser screenshots with `google-chrome --headless --screenshot` as a lightweight first pass before reaching for Playwright.
- Use Playwright when you need scripted inputs, multi-step capture, or the direct headless screenshot path is not rendering the Pixi/WebGL scene reliably in the current environment.
- If you add a new subsystem or rule family, place it near related engine modules and add tests alongside the behavior.
- If `src/main.ts` grows further because of your change, prefer extracting helpers rather than expanding one large block.
- Avoid speculative abstractions. Add structure only when the current code actually needs it.

## Pull Request / Change Bar

- Keep changes scoped.
- Include a short test plan in your final summary.
- Mention any constraints, follow-ups, or unverified paths explicitly if you could not run the full checks.
