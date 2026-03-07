# docs/10-engineering-workflow.md

## Goal

Enforce consistent code quality and repository hygiene while keeping iteration fast.

## Enforcement plan

1. **Phase 1: Baseline quality gates (now)**
   - Type safety with TypeScript strict mode (`npm run typecheck`).
   - Linting with ESLint (`npm run lint`).
   - Test suite with Vitest (`npm run test`).
   - Browser smoke replay for the fixed-seed full objective loop (`npm run test:e2e`).
   - Unified command: `npm run check`.
2. **Phase 2: Local automation (now)**
   - Pre-commit hook: lint/format staged files and run related tests.
   - Pre-push hook: `npm run check:prepush` (`lint + typecheck + unit tests`).
   - Run `npm run check` manually before substantial changes are considered done so the deterministic browser smoke remains part of the local quality bar without blocking every push.
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
- The committed Playwright smoke path should stay deterministic: prefer fixed seeds plus `window.render_game_to_text` / `window.advanceTime(ms)` over adding separate test-only gameplay controls.
- The smoke script should prefer Playwright-managed Chromium, then fall back to common local Chrome/Chromium app installs when the managed browser is unavailable. Only force a browser binary with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when you need to debug a specific local browser install.
- If Chromium cannot launch because the local Playwright browser install is missing or the current sandbox blocks browser crash-report/bootstrap setup, the smoke script may emit an explicit `[e2e] skipping browser smoke:` line instead of hanging. Treat that as an environment limitation to fix locally, not as gameplay coverage passing in CI.
- When a session uncovers actionable follow-up work that will not be fixed immediately, add an open
  report under `docs/issues/` before handoff so the next contributor has a durable queue entry.
- Name issue files `YYYYMMDD-short-kebab-case-summary.md`.
- Keep each issue report brief but operational: describe the problem, reproduction/observation,
  impact, and any likely starting points or constraints for the next agent.
- When the issue is resolved, append a short resolution note and move the file to
  `docs/issues/closed/`.

## Worktree policy

- All repo changes should happen in a linked worktree on a task branch, not directly in the primary checkout, unless a user explicitly overrides this.
- Treat agent-instruction edits as normal repo changes for this rule. Updating `AGENTS.md`, README workflow guidance, or this workflow doc still requires its own task worktree and branch.
- Begin each task by running `git worktree list` so you can see which linked worktrees and branches are already active.
- Before reusing, merging, or deleting another worktree, check for an active concurrent Codex session. Prefer local evidence such as `ps -axo pid,etime,command | rg '[c]odex'` plus a cwd lookup like `lsof -a -d cwd -p <pid>` on macOS when you need to map a process to a worktree path.
- Create linked worktrees under `.worktrees/` with `git worktree add .worktrees/<task-name> -b <branch-name>`.
- Choose a fresh branch name for each worktree. Git does not allow one branch to be checked out in multiple worktrees.
- Use existing worktree names, branch names, and branch-local documentation updates as coordination signals before claiming new work. Relevant branch-local docs include `docs/issues/`, `progress.md`, `IMPLEMENTATION_NOTES.md`, and the numbered design docs touched by that branch.
- Reading from another worktree is allowed for coordination and review. Writing into another agent's worktree is not allowed; confine edits to your own current worktree.
- Commit incrementally while the task is in progress so review and rollback stay straightforward.
- Merge completed worktree branches back into `main` with non-interactive git commands.
- If you find an inactive worktree with no live Codex session attached, inspect its branch, finish any coherent pending work, merge it into `main`, then remove the linked worktree and delete the merged branch.
- If that merge produces conflicts, resolve them in the current session instead of deferring by default. Preserve both branches' intended behavior where possible, run the most relevant checks, and complete the merge before cleanup.
- After merging, remove the linked worktree and delete the merged branch as part of finishing the task.
- `.worktrees/` must stay gitignored and excluded from recursive repo tooling such as search, lint, and formatting.
- Do not place live worktree checkouts inside `.git/`; only Git-managed metadata belongs under `.git/worktrees/`.
- Before deleting a worktree or handing off its branch, capture any unfinished actionable findings in
  `docs/issues/` so they are not stranded in local branch history.

## Deployment note

- Static builds should prefer relative asset paths unless a deploy target truly requires a fixed absolute base. This avoids blank-page failures when the same artifact is served from both a repo subpath and a custom-domain root.
