# docs/10-engineering-workflow.md

## Goal

Enforce consistent code quality and repository hygiene while keeping iteration fast.

## Enforcement plan

1. **Phase 1: Baseline quality gates (now)**
   - Type safety with TypeScript strict mode (`npm run typecheck`).
   - Linting with ESLint (`npm run lint`).
   - Test suite with Vitest (`npm run test`).
   - Unified command: `npm run check`.
2. **Phase 2: Local automation (now)**
   - Pre-commit hook: lint/format staged files and run related tests.
   - Pre-push hook: full check (`lint + typecheck + tests`).
3. **Phase 3: PR discipline (next)**
   - PR template + checklist for tests/docs updates.
   - Require status checks to pass before merge.
4. **Phase 4: Coverage hardening (later)**
   - Add minimum coverage threshold after the first stable gameplay slice.
   - Add deterministic replay tests for world generation and state transitions.

## Test policy

- **Features**: include tests for success paths and at least one edge case.
- **Bug fixes**: add a failing reproducer test first, then implement fix.
- **Simulation code**: deterministic tests must assert identical results for identical seeds.

## Documentation hygiene policy

- Keep docs and code aligned in the same PR.
- Update `ARCHITECTURE.md` when adding/changing foundational modules.
- Update this workflow doc when changing quality gates or branching/worktree policy.
- When validating browser visuals, prefer the lightest tool that answers the question: direct `google-chrome --headless --screenshot` capture is a good first pass, while Playwright remains the default for scripted interaction, state setup, or cases where headless Chrome capture is not reliable enough.
- When a session uncovers actionable follow-up work that will not be fixed immediately, add an open
  report under `docs/issues/` before handoff so the next contributor has a durable queue entry.
- Name issue files `YYYYMMDD-short-kebab-case-summary.md`.
- Keep each issue report brief but operational: describe the problem, reproduction/observation,
  impact, and any likely starting points or constraints for the next agent.
- When the issue is resolved, append a short resolution note and move the file to
  `docs/issues/closed/`.

## Worktree policy

- All repo changes should happen in a linked worktree on a task branch, not directly in the primary checkout, unless a user explicitly overrides this.
- Create linked worktrees under `.worktrees/` with `git worktree add .worktrees/<task-name> -b <branch-name>`.
- Commit incrementally while the task is in progress so review and rollback stay straightforward.
- Merge completed worktree branches back into `main` with non-interactive git commands.
- After merging, remove the linked worktree and delete the merged branch when feasible.
- `.worktrees/` must stay gitignored and excluded from recursive repo tooling such as search, lint, and formatting.
- Do not place live worktree checkouts inside `.git/`; only Git-managed metadata belongs under `.git/worktrees/`.
- Before deleting a worktree or handing off its branch, capture any unfinished actionable findings in
  `docs/issues/` so they are not stranded in local branch history.

## Deployment note

- Static builds should prefer relative asset paths unless a deploy target truly requires a fixed absolute base. This avoids blank-page failures when the same artifact is served from both a repo subpath and a custom-domain root.
