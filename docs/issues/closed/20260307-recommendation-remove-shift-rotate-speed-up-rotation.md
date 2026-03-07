# Recommendation: Remove Shift Fast-Rotate Modifier

## Summary

The map currently rotates faster when holding `Shift` with `Q` or `E`, but that modifier is not documented and does not feel necessary.

## Recommendation

- Remove the hidden `Shift` fast-rotate modifier.
- Increase the default map rotation responsiveness.
- Preserve or improve the current feeling that holding `Q` or `E` longer should spin the board up faster over time.

## Why

- Hidden controls increase input complexity without helping readability.
- Rotation should feel good on the documented controls alone.
- A smooth acceleration curve is easier to learn than an undocumented speed modifier.

## Resolution

Resolved on 2026-03-07.

- Removed the hidden `Shift` fast-rotate modifier.
- Increased default map rotation responsiveness.
- Moved map rotation stepping into a dedicated runtime helper with tests covering hold-based acceleration.
