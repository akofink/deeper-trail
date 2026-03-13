# docs/08-sharing-and-seeds.md

## Shareable artifacts
- Seed code
- Seed + build code (`DT1-<seed>-<levels>-<condition>`)
- Screenshot of vehicle build card
- “Notebook export” (text + glyphs)
- Route map with highlighted discoveries

Current format details:
- `DT1` is the share-code version tag.
- `<seed>` is normalized to uppercase alphanumeric and clipped for compact HUD display.
- `<levels>` encodes subsystem levels in fixed order: `frame, engine, scanner, suspension, storage, shielding`.
- `<condition>` encodes subsystem condition in the same fixed order.
- The format is deterministic and simulation-derived, so identical state yields identical codes.

## Low-friction sharing UX
- Copy seed button
- “Share build” code (module list compressed)
- Optional: Export run summary as an image (client-side canvas)

## Anti-spoiler controls
- Share codes can omit mystery revelations
- Player can choose “build-only” vs “build + clues”
