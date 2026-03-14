Discovery date: 2026-03-14

Problem:
CI could fail in `tests/browserShell.test.ts` with `ReferenceError: navigator is not defined` because `src/game/runtime/browserShell.ts` imported Pixi at module evaluation time, even when tests only needed the pure helper exports.

How to reproduce or observe it:
Run the browser-shell helper test in a Node environment where `navigator` is absent during module import. Pixi's browser adapter evaluates immediately and throws before the helper tests can execute.

Why it mattered:
This broke the CI test suite for a deterministic helper module and made browser-shell utility coverage depend on browser globals instead of the actual helper behavior under test.

Known constraints or likely starting points:
The failure came from top-level imports in `src/game/runtime/browserShell.ts`. The fix needed to preserve the runtime bootstrap path while keeping helper-only imports safe under Vitest's Node execution mode.

Resolution:
Deferred the Pixi and renderer imports until `bootstrapBrowserShell()` runs in `src/game/runtime/browserShell.ts`, and added `tests/browserShell.import.test.ts` as a regression test that imports the module with no `navigator` present.
