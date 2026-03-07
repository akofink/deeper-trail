# Contributing Guide

## Quality bar (required)

- Every feature PR includes or updates tests for the new behavior.
- Every bug fix PR includes a reproducing test that fails before the fix and passes after.
- No direct commits to main; use small, scoped pull requests.

## Local workflow

1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Run full quality checks before push: `npm run check`

## Worktrees

- Use the main checkout for small, low-risk edits.
- For larger tasks or parallel Codex sessions, create linked worktrees inside `.worktrees/` with `git worktree add .worktrees/<task-name> -b <branch-name>`.
- Keep `.worktrees/` out of commits and normal repo scans; the repo config ignores it for Git, ripgrep, ESLint, and Prettier.
- Do not create live checkouts inside `.git/`.

## Commit hooks

- `pre-commit`: runs lint-staged for fast lint/format and related tests on staged files.
- `pre-push`: runs `npm run check:prepush` (lint + typecheck + unit tests).
- Run `npm run check` manually before substantial changes are considered complete so the browser smoke path still gets exercised outside the push hook.

If hooks are not active locally, run `npm run prepare` after cloning.
If this repo has not been initialized yet, run `git init` first so Husky can install hooks.

## Coding rules

- Keep simulation deterministic: route all random behavior through `src/engine/rng`.
- Keep rendering side-effect free with respect to simulation state.
- Prefer small pure functions in `src/engine` and test them first.

## Pull request checklist

- [ ] Feature or bug behavior is covered by tests
- [ ] Bug fix includes a reproducing test case
- [ ] `npm run check` passes
- [ ] Docs updated when behavior or workflow changed
