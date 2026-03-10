Discovery date: 2026-03-09

What is wrong or missing:
Popup messages are easy to miss, prompt-heavy interactions ask players to read too much text, and beacon/anomaly-boost feedback is not legible enough in motion.

How to reproduce or observe it:
Play through beacon interactions and anomaly boost moments, especially while moving quickly, and note how easy it is to miss the prompt or fail to understand the expected response.

Why it matters:
Critical interaction cues should survive motion and moment-to-moment play. If players miss them, the prototype feels opaque even when the underlying rules are workable.

Known constraints, suspected cause, or likely starting points:
Review prompt presentation and local feedback effects in [src/main.ts](/Users/akofink/dev/repos/deeper-trail/src/main.ts). A fix may combine lighter copy with stronger local animation or non-text affordances.
