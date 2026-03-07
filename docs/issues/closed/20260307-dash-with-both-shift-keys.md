It's possible to press both shift keys during a dash, which makes the dash meter drain fully and
bounce at the bottom, effectively making the game think the player is dashing indefinitely, and a
jittery dash animation is shown as the dash meter constantly runs out and replenishes a small
amount. Dashing allows the player to dash right through obstacles without taking damage. The two
issues combined allow the player to dash through obstacles indefinitely.

Resolution note (2026-03-07): Fixed by treating simultaneous `ShiftLeft` + `ShiftRight` as a
conflicted dash input instead of an active dash hold. Added regression coverage for the dash input
state so dual-shift no longer sustains invulnerable boost behavior.
