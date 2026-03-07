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
- Update this workflow doc when changing quality gates or branching policy.

## Worktree policy

- The primary checkout at the repo root remains the default workspace for small changes.
- Larger features, roadmap slices, or parallel Codex sessions should use linked worktrees created under `.worktrees/`.
- Recommended command: `git worktree add .worktrees/<task-name> -b <branch-name>`.
- `.worktrees/` must stay gitignored and excluded from recursive repo tooling such as search, lint, and formatting.
- Do not place live worktree checkouts inside `.git/`; only Git-managed metadata belongs under `.git/worktrees/`.

## Deployment note

- Static builds should prefer relative asset paths unless a deploy target truly requires a fixed absolute base. This avoids blank-page failures when the same artifact is served from both a repo subpath and a custom-domain root.
