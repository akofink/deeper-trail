Discovery date: 2026-03-13

Issue:
The boost/dash behavior was burning too much of the boost meter up front, so short Shift taps felt nearly the same as a committed hold. Players could not reliably feather boost length based on how long they held the key.

How to observe:
- Start a run with a full boost meter.
- Tap Shift briefly, then compare the remaining boost to a longer held boost.
- Before the fix, the quick tap still consumed enough energy that the control did not feel proportional to hold duration.

Why it matters:
The anomaly objective set and the basic run feel both depend on boost being a readable, intentional input. If short taps and committed holds spend nearly the same resource, the boost system loses expressiveness and feels unresponsive.

Likely starting points:
- `src/game/runtime/runStep.ts`
- `src/game/runtime/runDash.ts`
- `tests/runStep.test.ts`

Resolution note:
Reduced the dash entry cost and per-second drain so a brief tap preserves most of the meter while sustained holds still spend meaningfully more. Added regressions that compare quick-tap versus held boost energy use.
