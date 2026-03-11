Original prompt: Build and iterate the playable web game in the games/202601-2d-journey--deeper-trail workspace, validating changes with a Playwright loop. [$develop-web-game](/mnt/c/Users/ajkof/.codex/skills/develop-web-game/SKILL.md)

- Initialized progress tracking file.
- Confirmed current state: project boots Pixi canvas with only title text, no gameplay loop yet.
- Confirmed Playwright client requirements: must expose `window.render_game_to_text` and `window.advanceTime(ms)` for deterministic stepping and state capture.

- Installed Node LTS with nvm (`v24.14.0`) and Playwright tooling; added local copy of the required Playwright client at `scripts/web_game_playwright_client.js` to resolve module lookup in this environment.
- Implemented playable side-scroller in `src/main.ts` with deterministic stepping (`window.advanceTime`), text-state export (`window.render_game_to_text`), movement/jump, hazards, collectibles, win/lose, restart, pause, and fullscreen toggle.
- Fixed runtime draw bug (`Graphics.polygon` unsupported) by switching to path-based flag rendering.
- Added explicit favicon data URL in `index.html` to remove 404 console error seen in Playwright run.
- Validated interactions via Playwright action loops:
  - Movement/jump/hazard chain transitions and loss condition.
  - Lose -> restart (`Enter`) flow restored `mode=playing`, `health=3`, and reset positions/stats.
  - `render_game_to_text` state matched observed gameplay transitions in screenshots.
- Addressed layout bug report by adding `src/styles.css` and importing it in `src/main.ts`; reset `html/body/#app` margins and overflow to remove scrollbars.
- Noted environment nuance: headless capture can produce black canvas images for this Pixi/WebGL setup; headed Playwright captures render correctly and were used as visual source of truth.

TODOs / suggestions for next iteration:

- Add Playwright key mapping for `p`, `f`, and `r` in the shared client or use custom actions path so pause/fullscreen/restart-by-R can be automated directly.
- Add a lightweight in-game start/menu screen (with controls text) before gameplay if desired by product direction.
- Add unit tests for deterministic reset and hazard damage logic in a pure simulation module to reduce regression risk.

- Reviewed brainstorm docs (`00-vision`, `01-core-loop`, `09-mvp-scope`) and selected next roadmap slice: deterministic node travel on a map with resource costs.
- Expanded simulation state in `src/game/state/gameState.ts`:
  - Added fuel/fuelCapacity, scrap, and 6 vehicle subsystems.
- Upgraded travel sim in `src/engine/sim/travel.ts`:
  - Travel now requires an adjacent edge from current node.
  - Travel consumes fuel based on edge distance.
  - Added explicit failure reasons for same-node travel, no route, and insufficient fuel.
- Added/updated tests:
  - `tests/travel.test.ts` now covers fuel consumption, non-adjacent rejection, and insufficient fuel rejection.
  - `tests/seededRng.test.ts` now asserts `next()` stays in [0, 1).
- Implemented roadmap UI/gameplay wiring in `src/main.ts`:
  - Added `run` and `map` scenes.
  - Added map toggle on `A`, route selection on Up/Down, travel on Enter.
  - Added arrival rewards by node type and biome-dependent run visuals/hazard layouts.
  - Preserved deterministic stepping hook and render-to-text output with map+run state.
- Fixed critical RNG bug in `src/engine/rng/seededRng.ts` where signed bitwise masking could produce negative random values and undefined node types.
- Validation evidence:
  - `npm run typecheck` passes.
  - `TMPDIR=/tmp npm run test` passes (9 tests).
  - Playwright headed scenarios confirmed map state transitions, fuel/day updates, route selections, and no console errors.

TODOs / suggestions for next iteration:

- Add explicit on-screen map legend and a dedicated map screenshot capture path (first frame can still render black in this environment).
- Add a minimal crafting/repair action that spends scrap and modifies one subsystem in map scene.
- Add deterministic simulation tests for arrival rewards and biome-run layout selection by node type.

- Level balance pass:
  - Reworked run layout generation with jump-safe obstacle widths and reduced collectible heights so all scrap pickups are reachable within the current jump envelope.
  - Verified via Playwright run that collectibles can be gathered mid-run (`score`/`scrap` increased, `collectiblesRemaining` decreased).
- Clarified progression and travel semantics:
  - Added explicit node-completion tracking (`completedNodeIds`) and gated map travel until the current node run is completed.
  - Added `freeTravelCharges`: each completed run grants one free travel charge; next travel refunds fuel cost.
  - Updated run/map HUD and overlay copy to clearly explain completion rewards and travel lock/unlock state.
- Fixed map distance mismatch:
  - `worldGraph` edge distance now derives from node geometry (Euclidean projection) instead of unrelated random values.
  - Map edge line width now scales with distance for visual consistency cues.
- Validation:
  - `npm run typecheck` passes.
  - `TMPDIR=/tmp npm run test` passes.
  - Playwright lock-check confirms pre-completion travel is blocked with explicit message.
  - Playwright balance-check confirms hazards are traversable and elevated collectibles are collectable.

TODO:

- Add a deterministic test hook or reduced-difficulty scripted path to verify free-travel charge consumption end-to-end in Playwright without manual play.

- Interest pass: moved beyond pure endless-run feel by adding an objective and a timed ability.
- New run mechanics in `src/main.ts`:
  - Signal beacon objective: 3 beacons per run must be linked (`Enter`) to unlock the exit.
  - Moving hazards: alternating hazards now patrol with sinusoidal offsets.
  - Dash ability: `Shift` performs short burst with brief invuln and cooldown.
  - Exit lock behavior now explicitly reports remaining beacons when player reaches finish early.
  - Added in-range beacon prompt to reduce interaction ambiguity.
- Telemetry/state updates:
  - `render_game_to_text` now includes beacon statuses and dash cooldown.
  - HUD now surfaces beacon progress and dash readiness.
- Playwright tooling update:
  - Added `shift` key support to local `scripts/web_game_playwright_client.js` mapping.
- Validation:
  - Typecheck/tests pass.
  - Playwright state confirms moving hazard x-shifts over time and dash cooldown activation after dash input.
  - Playwright beacon-link check captured successful beacon activation state (`beacons[0].activated=true`, score +15).

TODO next:

- Add a deterministic test action sequence that links all 3 beacons and completes a node in one run for full end-to-end automation.
- Add biome-specific beacon behaviors (e.g., timed windows in anomaly biome, chain-order constraints in ruins).

- Roadmap continuation: added first deterministic crafting/repair slice for the vehicle loop.
- Simulation/state changes:
  - Added persistent `vehicleCondition` tracking for all 6 subsystems in `src/game/state/gameState.ts`.
  - Added `src/engine/sim/vehicle.ts` with deterministic biome-linked subsystem damage and a scrap-funded field repair action.
  - Hazard collisions now apply subsystem wear by node biome (`anomaly -> shielding`, `nature -> suspension`, `ruin -> frame`, `town -> engine`).
- UI/gameplay wiring in `src/main.ts`:
  - Map scene now shows subsystem condition summary.
  - Added `B` map action to fabricate/use a field repair kit, spending 1 scrap to restore the most damaged subsystem by 1 condition.
  - `render_game_to_text` now exports `vehicleCondition` and `repairCostScrap` for automation.
- Tests:
  - Added `tests/vehicle.test.ts` covering biome damage routing and repair selection/cost behavior.
  - `npm run typecheck` passes.
  - `TMPDIR=/tmp npm run test` passes (12 tests).
- Playwright validation:
  - Added `output/actions-repair-check.json`.
  - Headed Playwright run confirmed collect -> hazard damage -> map repair flow.
  - Final captured state in `output/web-game-repair-check/state-0.json` shows `score=10`, `scrap=0`, `vehicleCondition.shielding=2`, and repair confirmation message `Fabricated repair kit: shielding restored to 2/3 (-1 scrap).`
  - Visual screenshot `output/web-game-repair-check/shot-0.png` matches map overlay and subsystem condition summary.

TODO next:

- Add a proper module crafting/install action so subsystem levels, not just condition, can change through scrap investment.
- Add deterministic automation for full node completion (all 3 beacons + exit + travel refund) so the whole core loop is covered end-to-end.
- Improve map HUD layout on narrower widths; the top status line is close to clipping once controls text grows.

- Roadmap continuation: added the first deterministic module crafting/install loop.
- Simulation/state changes:
  - Expanded `src/engine/sim/vehicle.ts` with biome-site install offers, scrap-scaled upgrade costs, a subsystem level cap, and install application rules.
  - Installing an engine module now increases `fuelCapacity` and refills to the new cap.
  - Existing subsystem levels now feed back into gameplay:
    - `frame` raises max health.
    - `scanner` increases beacon link radius.
    - `suspension` increases jump strength.
    - `storage` increases scrap yield from pickups at higher levels.
    - `shielding` increases post-hit invulnerability time.
- UI/gameplay wiring in `src/main.ts`:
  - Added `C` map action to install the current node's site module.
  - Map HUD/overlay now show module levels and the available install offer/cost for the current node.
  - `render_game_to_text` now exports `installOffer` and `maxHealth` for automation and debugging.
- Tooling/tests:
  - Added `c` key support to `scripts/web_game_playwright_client.js`.
  - Expanded `tests/vehicle.test.ts` to cover install-offer selection, successful installs, and maxed-site rejection.
  - Validation:
    - `npm run typecheck` passes (via `nvm use --lts` bootstrap in this shell).
    - `TMPDIR=/tmp npm run test` passes (15 tests).

TODO next:

- Add deterministic automation for full node completion (all 3 beacons + exit + travel refund) so the whole core loop is covered end-to-end.
- Improve map HUD layout on narrower widths; module-level text increases clipping pressure.
- Add at least one puzzle template or mystery beat so module progression unlocks something beyond raw stat improvement.

- UX/game-feel pass based on play feedback:
  - Replaced the text-heavy fullscreen-biased HUD in `src/main.ts` with compact panel/bar indicators for run and map scenes.
  - Run HUD now emphasizes health pips, fuel, current speed, beacon progress, dash charge, and subsystem meters visually instead of long status strings.
  - Map HUD now uses compact resource/module panels and shorter action hints so it fits more reliably in windowed play.
- Character feel / control changes:
  - Added coyote time and jump buffering so jumps are less brittle.
  - Added variable jump height via jump cut on early key release.
  - Replaced instant horizontal velocity snaps with acceleration/deceleration, plus stronger air-turn acceleration when reversing midair.
  - Vehicle module progression now feeds more directly into feel: engine affects run speed, suspension affects jump height, scanner affects beacon range, shielding affects hit recovery, storage affects salvage yield.
- Character presentation:
  - Split player rendering into its own Pixi graphics path so the body can lean/turn with movement.
  - Added facing-aware eye/forward marker plus squash/stretch and shadow response tied to speed and vertical motion.
- Validation:
  - `npm run typecheck` passes (via `nvm use --lts` bootstrap in this shell).
  - `TMPDIR=/tmp npm run test` passes (15 tests).

TODO next:

- Manual playtest the new feel pass, especially midair reversals, short-hop control, and non-fullscreen readability on both map and run scenes.
- Add a first puzzle/interaction template that uses the improved embodiment layer, e.g. timing/positioning around scanner pulses or directional signal alignment.
- Consider reducing persistent overlay text further by turning map actions into button-like visual chips/icons rather than sentence hints.

- Local playtest pass:
  - Ran the game locally through Vite and a headed Playwright sequence using `output/actions-feel-hud-check.json`.
  - Captured outputs in `output/web-game-feel-hud-check/`.
  - Confirmed map HUD readability is materially better in a normal window: the panel-based layout fits without the previous top-line clipping.
  - Found one remaining contrast issue during the pass: the bottom map control hint was too faint against the light background. Updated `src/main.ts` so `subHud` uses a darker slate tone on the map scene while preserving the brighter tone in the run scene.
  - Remaining environment nuance: the run-scene screenshot from this Pixi/WebGL setup can still capture as black in this environment even when state capture succeeds, so movement feel still benefits from human eyes in addition to automation.
- Validation after playtest follow-up:
  - `npm run typecheck` passes (via `nvm use --lts` bootstrap in this shell).
  - `TMPDIR=/tmp npm run test` passes (15 tests).

TODO next:

- Manual playtest the new feel pass with a human in the loop, focusing on whether short hops, midair reversals, and body lean read as satisfying rather than just permissive.
- Reduce map-overlay sentence text further; the panels are working, but the center-bottom copy still carries too much explanatory load.
- Add a first embodied puzzle/interaction template so the improved movement and facing can drive actual play decisions.

- HUD clarity pass:
  - Kept the compact panel-based HUD direction but added explicit labels so the visuals are self-identifying instead of "mystery meat" bars.
  - Run scene now labels health/fuel/pace on the left panel and links/dash/modules on the right panel.
  - Map scene now labels trips/fuel and vehicle level/condition directly in the top panels.
  - Added subsystem name labels to each module cell so level/condition meters map to a named part without requiring memory.
  - Added chip-style control hints along the bottom so actions feel more like buttons/verbs than a raw text footer.
- Validation:
  - `npm run typecheck` passes (via `nvm use --lts` bootstrap in this shell).
  - `TMPDIR=/tmp npm run test` passes (15 tests).

TODO next:

- Re-run a visual playtest to judge whether the panel labels are enough or whether health/fuel/dash also need tiny icons in addition to text.
- Reduce center-bottom overlay sentences by moving route/install information into smaller tagged UI elements near the relevant panels.
- Add the first embodied puzzle/interaction template so the clearer HUD and improved movement support actual decision-making rather than just traversal.

- Follow-up pass from screenshot review:
  - Tightened HUD value spacing so numeric readouts sit inside the top panels instead of crowding the outer edges.
  - Added layered run-scene terrain silhouettes and biome-colored low-profile bands so the scene has visible landform structure before adding richer mechanical terrain.
  - Kept the terrain purely visual for now; this is a readability/game-feel pass, not a collision-model change.
- Documentation upkeep:
  - Expanded `ARCHITECTURE.md` with the current runtime split and the active HUD/rendering direction.
  - Expanded `IMPLEMENTATION_NOTES.md` with explicit UI and world-render guidance based on recent playtest iterations.

- Map/UI cleanup pass from screenshot review:
  - Removed the midpoint circle treatment that was visually punching gaps into map edge lines.
  - Added a selected-route highlight pass so the currently targeted connection stands out from the rest of the graph.
  - Reworked the map layout to use a dedicated lower info card for route/install/travel details instead of loose centered text near the footer.
  - Normalized top-panel padding and bottom-chip placement so the screen has cleaner vertical rhythm.
- Documentation upkeep:
  - Extended `ARCHITECTURE.md` and `IMPLEMENTATION_NOTES.md` with explicit guidance for treating the map as a navigable route board rather than a graph debug view.

- Layout refinement pass from new screenshots:
  - Converted run-scene status copy into a compact message banner so win/pause/loss text no longer dominates the center of the screen.
  - Repositioned map route/install details into a left-anchored high-contrast card and separated the bottom action chips from that card to reduce overlap and hierarchy conflicts.
  - Shortened map detail strings so the card communicates route/install state quickly instead of reading like a debug sentence block.

- Systematic overlap fix pass:
- Roadmap continuation: added a maintainability split plus the first nature-specific embodied objective rule.
- Refactor / modularity:
  - Extracted runtime-facing types into `src/game/runtime/runtimeState.ts`.
  - Extracted deterministic run layout + palette config into `src/game/runtime/runLayout.ts`.
  - Extracted derived vehicle stat helpers into `src/game/runtime/vehicleDerivedStats.ts`.
  - Extracted node lookup / route-neighbor / expedition-target helpers into `src/engine/sim/world.ts`.
  - Reduced `src/main.ts` from 1876 lines to 1657 lines by moving repeated config/rule helpers out of the Pixi shell.
- Gameplay:
  - Added a `nature` relay rule in `src/engine/sim/runObjectives.ts`: relays in nature biomes must be linked while airborne.
  - Updated in-run prompt text so nature nodes clearly instruct jump-through linking, including scanner auto-link messaging.
- Tests / validation:
  - Expanded `tests/runObjectives.test.ts` to cover the new `nature -> airborne` rule and updated activation contexts.
  - `npm run check` passes.

TODO next:

- Continue breaking `src/main.ts` into scene-oriented modules, with HUD/card rendering helpers as the next high-value extraction point.
- Add deterministic automation or test coverage for a full nature-node completion path so the airborne relay rule is covered beyond unit activation checks.
  - Consider whether town nodes should keep the standard relay rule or become the home for a different low-complexity puzzle verb.
  - Added a reusable text-card layout helper in `src/main.ts` so run/map message cards size themselves from measured text content plus padding.

- Browser regression coverage pass:
  - Added `?seed=` boot support in `src/main.ts` so browser runs can replay a deterministic world directly from the URL.
  - Added committed Playwright smoke automation in `scripts/e2e/fullObjectiveLoop.js`.
  - The smoke path builds `dist/`, opens the static app via `file://`, completes the fixed-seed town node objective loop, returns to map, then travels once and asserts shell/state synchronization through `window.render_game_to_text`.
  - Wired the browser smoke into `package.json` as `npm run test:e2e` and folded it into `npm run check`.
  - Replaced the fixed-size run banner and map detail card layout with wrapped content-aware cards to prevent text spill/overlap as strings change.
  - Added matching implementation guidance in `IMPLEMENTATION_NOTES.md` so future UI tweaks follow the same rule instead of returning to guessed dimensions.

- Footer containment fix:
  - Replaced the single stretched footer help string with one label per action chip in both run and map scenes.
  - This ensures each keybinding/help caption is centered inside its own chip and no longer bleeds across neighboring chip backgrounds.

- Footer clarity pass:
  - Upgraded action chips from key-only labels to explicit `key + action` labels on both run and map screens.
  - Increased chip height slightly so the bindings can be shown as two-line labels without reintroducing overlap.

- Exploration-intel and vehicle-readability pass:
  - Added persistent exploration knowledge in `src/game/state/gameState.ts` so visited nodes and learned biome notes survive across runs/travel during a session.
  - Added `src/engine/sim/exploration.ts` to record discovered biome benefits on arrival and biome-specific wear notes after taking hazard damage.
  - Map screen now color-codes nodes by biome, marks visited/completed locations, and surfaces a dedicated field-notes card so players can remember route value at a glance.
  - Route details now include known biome benefit/risk intel, which makes nature nodes visibly read as the current healing destination once that behavior has been discovered.
  - Replaced the old lone-body avatar treatment with a rider-on-machine silhouette in `src/main.ts`, including wheels, chassis, rider posture, and module-driven attachments for scanner, cargo, shielding, suspension, and engine output.
  - Added `tests/exploration.test.ts`; `npm run typecheck` and `TMPDIR=/tmp npm run test` pass (17 tests).

TODO next:

- Human playtest the new map notes layout at normal window sizes; the extra notes card adds information density and may need another spacing pass.
- Review whether biome effects should become partially legible before first arrival via scanner/module progression, rather than staying fully unknown until experienced.
- Push the vehicle presentation further with terrain interaction cues or dust/trail effects so momentum reads from the whole machine, not just the silhouette.

- Health-loop and world-variation pass:
  - Removed the fixed `deeper-trail-alpha` runtime seed in `src/main.ts`; new sessions now generate a fresh per-run seed while preserving deterministic simulation within that run.
  - Surfaced the active seed in both HUDs so a specific world can be discussed or reproduced later if needed.
  - Added a second HP-recovery lane outside nature biomes: when the vehicle is already fully repaired, the existing `B` repair action now converts scrap into a med patch for +1 HP.
  - Added a clean-run recovery bonus: completing a trail without taking damage restores +1 HP in addition to the free travel charge, so skillful play can stabilize runs without forcing a nature detour every time.
  - Updated the map detail card to explain the new repair/HP interaction so the strategy is legible in play.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (17 tests).

TODO next:

- Consider moving the active seed from the main meta strip into a dedicated small chip/card if it starts crowding HUD readability.
- Add a deliberate "new expedition" affordance so players can reroll the world on demand instead of only via page reload or loss reset.
- Rebalance med-patch cost/effect after human play; `2 scrap -> 1 HP` is a first pass, not a tuned economy.

- Scanner progression pass:
  - Promoted scanner from a pure range stat into a verb unlock: scanner level 3 now auto-links beacons when the rider enters range, removing the need to press `Enter` for that interaction once the upgrade is earned.
  - Updated run-scene prompts/chips so the HUD explains whether beacon linking is manual or auto.
  - Added map-scene scanner guidance so the unlock threshold (`lv.3`) is visible before the player discovers it by accident.
  - Added `hasAutoLinkScanner` in `src/engine/sim/vehicle.ts` and coverage in `tests/vehicle.test.ts`.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (18 tests).

Upgrade ideas worth pursuing next:

- `Shielding` overcharge: first hit in a run burns shield charge instead of HP, then recharges on node completion or in anomaly sites.
- `Storage` magnet rig: scrap pickups arc toward the vehicle from farther away, letting salvage runs feel different from precision runs.
- `Engine` overdrive: gain a second dash charge or a charge that refills faster on near-miss/hazard traversal.

- Deployment pass:
  - Added GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.
  - Updated `vite.config.ts` to honor `VITE_BASE_PATH`, allowing CI builds to publish correctly under the repository subpath.
  - Documented the GitHub Pages setup in `README.md` for `akofink/deeper-trail`.
- `Suspension` terrain skip: brief hop-stabilizer or landing shockwave that clears low hazards / keeps pace through rough nodes.
- `Frame` rig slots: unlock a second site benefit choice so towns/ruins become more strategic than a single deterministic install.

- Fullscreen/resize bugfix:
  - Fixed run-scene resize handling in `src/main.ts` so toggling fullscreen no longer leaves hazards, beacons, and collectibles stranded at their old vertical positions while the ground moves.
  - Resize now shifts the active run scene vertically by the `groundY` delta and then re-clamps the player to the new floor, which removes the large empty band and the "vehicle falls after exiting fullscreen" bug.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (18 tests).

- HUD/install clarity pass:
  - Clarified install failure messaging in `src/engine/sim/vehicle.ts` so "this site is exhausted" is distinct from "the whole vehicle is globally maxed."
  - Updated map install copy in `src/main.ts` to say "try a different biome" when the current node cannot offer more upgrades but other subsystems are still below max.
  - Moved the active seed out of the crowded top metadata strip into its own small label inside the left HUD panel, removing overlap with the run/map title line.
  - Added tests covering the new global-vs-site max messaging split.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (19 tests).

- HUD seed follow-up:
  - The first seed-label move still allowed collisions with the top title/meta row on some window sizes.
  - Shifted the seed label onto its own second row inside the left panel in `src/main.ts`, which gives it dedicated vertical space instead of sharing the header strip.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (19 tests).

- Map detail-card containment fix:
  - The lower-left route detail card was still anchored to a fixed Y position while its content height kept growing, which let longer text run off the bottom of the screen.
  - Updated `layoutTextCard` in `src/main.ts` to return measured card size and used that measurement in the map scene to place both lower cards above the action-chip row dynamically.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (19 tests).

- Expedition-goal and map-copy pass:
  - Added an explicit expedition goal node in `src/main.ts`, chosen as the farthest node from the starting side of the graph and highlighted on the map with a distinct ring/star treatment.
  - Completing the run at that goal node now marks the expedition complete and surfaces a `N` new-expedition action on the map, giving the game an actual macro win condition instead of only per-node completion.
  - Compressed map text substantially: route details are shorter, install/scanner/repair notes are terser, and field notes now summarize each biome in a single compact line instead of a three-line block.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (19 tests).

TODO next:

- Rework vehicle motion so the chassis leads the feel more than the rider body; the current kinematics still read as a person carrying a machine rather than piloting one.
- Replace the dash teleport with a brief boosted state, wheel stretch, and trailing afterimage so it reads as acceleration instead of snapping.
- Decide whether the map should stay as an abstract route board or become a pseudo-3D space board; if the latter, add a lightweight projected rotation control rather than trying to turn the current flat graph directly into a physical 3D map.

- Celebration / motion / map-projection pass:
  - Upgraded expedition completion presentation in `src/main.ts` with a centered celebration banner on the map and explicit `N` new-expedition callout so the macro win reads as an event, not just a status label.
  - Reworked dash from a hard position snap into a short boosted dash state with eased velocity, chassis afterimages, and faster wheel spin so it reads more like acceleration.
  - Added a rotatable projected map board (`Q` / `E`) in `src/main.ts`; nodes now render through a lightweight rotated projection with depth-influenced sizing/edge alpha to push the board away from a purely flat graph.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (19 tests).

TODO next:

- Keep pushing embodiment: the dash is smoother, but the overall run motion still needs more chassis-led weight transfer and less rider-led squash to really read as vehicle physics.
- Decide whether the projected map should become the default presentation or remain a toy/secondary view; if default, its HUD and node glyphs need another readability pass.

- Rotation + dash-meter + world-shape follow-up:
  - Replaced click-step map rotation with smooth hold-based rotation and damping in `src/main.ts`, so `Q`/`E` now orbit the projected board continuously instead of jumping by fixed increments.
  - Converted dash from a cooldown label into a drain/recharge boost meter that supports partial use: holding `Shift` now spends only part of the meter, releases cleanly, and refills over time.
  - Renamed the run HUD label from `MODULES` to `SYSTEMS` and the middle meter from a hidden cooldown concept to an explicit `BOOST` energy display.
  - Reworked `src/engine/gen/worldGraph.ts` to generate clustered point clouds around multiple centers instead of uniform scatter, producing more varied non-flat maps that are more interesting to rotate.
  - Added a world-graph test that checks for substantial spread on both axes plus occupancy across multiple quadrants.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm run test` passes (20 tests).

- Rotation-speed follow-up:
  - Removed the hidden `Shift+Q` / `Shift+E` fast-rotate modifier after promoting it to a tracked issue report. Map rotation now uses stronger default responsiveness plus hold-based acceleration without any undocumented key combo.
  - Extracted the rotation stepping into `src/game/runtime/mapRotation.ts` with focused coverage in `tests/mapRotation.test.ts`, keeping the behavior easier to tune without growing `src/main.ts`.
  - Validation: `npm run typecheck` passes; `npm run test -- --run tests/mapRotation.test.ts tests/mapProjection.test.ts tests/mapSceneContent.test.ts` passes.

- Checkpoint + run-objective pass:
  - Committed the previously unstaged clustered world-shape work as `f240384` (`Refine world graph clustering`) so the roadmap pass starts from a clean repo checkpoint.
  - Added `src/engine/sim/runObjectives.ts` plus `tests/runObjectives.test.ts` to move the first biome-specific run-objective rules out of ad hoc UI logic and into testable simulation helpers.
  - Ruin nodes now require relay linking in sequence; trying to link a later relay first gives a clear failure reason instead of silently behaving like every other biome.
  - Anomaly nodes now require a stronger signal lock: relays only link while the vehicle is boosting or carrying enough momentum, which makes dash/speed matter to the objective rather than only to traversal.
  - Updated `src/main.ts` so route cards, in-run prompts, relay visuals, and `render_game_to_text` all expose the active objective rule for the current/selected node.
  - Rewrote `FEATURE_LIST.md` from the old starter checklist into a current-state roadmap so the backlog reflects the actual game rather than the pre-prototype MVP list.
  - Validation: `npm run typecheck` passes; `TMPDIR=/tmp npm test -- --run tests/runObjectives.test.ts tests/vehicle.test.ts tests/worldGraph.test.ts` passes.

- Roadmap review / refocus:
  - The project is no longer blocked on basic movement, travel, repairs, or HUD structure; those are functional enough to support more authored play.
  - The biggest current fun gap is that node runs still resolve too often into "traverse, link relays, leave." The next roadmap should prioritize interaction variety and mystery payoff over more UI polish.
  - New priority order:
    1. Add a lightweight notebook / clue layer so completing nodes yields signal fragments or observations that accumulate into a mini mystery arc.
    2. Add at least one more biome-specific puzzle template that changes moment-to-moment behavior, not just route math.
    3. Add juice to salvage and chassis motion so speed, pickups, and landings feel better even before adding more content.
    4. Add deterministic full-loop automation once the objectives settle enough to avoid constant brittle script churn.

TODO next:

- Human playtest the new ruin/anomaly relay rules and report whether they read as satisfying constraints or just surprise failure states.
- Add a simple clue/notebook system tied to node completion so the expedition goal feels like a mystery hunt, not only a far-right win marker.
- Prototype one more fun-forward vehicle verb from the existing brainstorm list, likely `storage` pickup magnetism or `shielding` first-hit shield burn, whichever feels better in play.

- Deployment fix pass:
  - Diagnosed the live white-screen issue on `https://deeper-trail.akofink.com/`: the published HTML referenced `/deeper-trail/assets/...` while the custom domain serves the site from root, so JS/CSS were 404ing and the app never booted.
  - Updated `vite.config.ts` to default production builds to relative asset paths (`./`) instead of an absolute `/` base.
  - Removed the hardcoded `/deeper-trail/` CI base-path override from `.github/workflows/deploy-pages.yml` so the generated artifact works on both the GitHub Pages project URL and the custom domain root.
  - Updated deployment docs in `README.md` and `docs/10-engineering-workflow.md`.
  - Post-deploy follow-up: the direct custom-domain URL worked immediately after the fix, while the GitHub Pages redirect path showed one stale white-page load until cached HTML expired; a refresh then loaded correctly. Treat that as cache propagation noise, not a remaining code bug.
  - Validation:
    - `npm run build` passes.
    - Built `dist/index.html` now references `./assets/...` instead of `/deeper-trail/assets/...`.
- Notebook / clue-layer pass:
  - Added `src/engine/sim/notebook.ts` plus `tests/notebook.test.ts` so clue discovery is deterministic, seed-stable, and testable outside the renderer.
  - Extended `GameState` with notebook state that tracks discovered biome clue families, concrete notebook entries, and synthesis unlock state.
  - Completing the first `ruin`, `nature`, and `anomaly` runs now logs one notebook clue each; discovering all three auto-adds a synthesis note to create a lightweight 3-beat mystery arc.
  - Updated `src/main.ts` map presentation and `render_game_to_text` so the notebook shows up in play/UI automation instead of living only in hidden state.
  - Updated `FEATURE_LIST.md` and `docs/06-puzzles-and-meta-mystery.md` to reflect the shipped notebook layer.
  - Validation: `npm run check` passes.

- Town relay-rule pass:
  - Reworked `src/engine/sim/runObjectives.ts` so town nodes are no longer the free/default relay case; they now require a grounded low-speed "steady" link window.
  - Added `isSteadyLinkReady(...)` and expanded `tests/runObjectives.test.ts` to cover fast, airborne, and settled town-link outcomes.
  - Updated `src/main.ts` prompts, short objective labels, and relay rendering so the steady rule is visible on both the map card and the run scene.
  - Updated `IMPLEMENTATION_NOTES.md` and `docs/06-puzzles-and-meta-mystery.md` so docs match the new objective pattern.

- Town service-bay pass:
  - Added deterministic town-only service bays via `src/game/runtime/serviceStops.ts` and `src/game/runtime/runLayout.ts`, giving towns a non-relay interaction verb based on grounded low-speed hold timing.
  - Extended runtime state/rendering in `src/main.ts` so service bays draw on the road, show progress, contribute to exit locks, and surface prompts before failure.
  - Updated `render_game_to_text` and map route details so automation and route cards expose the richer town objective summary instead of only relay rules.
  - Added `tests/serviceStops.test.ts` plus fixture updates in runtime tests; `npm run check` passes.

- Anomaly sync-gate pass:
  - Added deterministic anomaly-only sync gates via `src/game/runtime/syncGates.ts` and `src/game/runtime/runLayout.ts`, creating a non-relay fly-through objective that reuses the existing phase-window timing model.
  - Extended `src/main.ts` so sync gates render in-scene, show prompt/failure messaging when crossed, contribute to exit locks, and export through `render_game_to_text`.
  - Updated anomaly objective summaries in route-card/UI copy so the node no longer reads as boost-relays only.
  - Added `tests/syncGates.test.ts` plus runtime fixture updates; `npm run check` passes.

- Nature canopy-lift pass:
  - Added deterministic nature-only canopy lifts via `src/game/runtime/canopyLifts.ts` and `src/game/runtime/runLayout.ts`, creating a second nature verb based on sustained airborne control inside vertical draft zones.
  - Extended `src/main.ts` so canopy lifts provide a light upward assist, render their hold/progress state in-scene, contribute to exit locks, surface prompts, and export through `render_game_to_text`.
  - Updated objective summaries in `src/engine/sim/runObjectives.ts`, plus architecture/design docs, so nature nodes no longer read as airborne-relays only.
  - Added `tests/canopyLifts.test.ts` plus runtime fixture updates; targeted typecheck and runtime tests pass.

- Ruin impact-plate pass:
  - Added deterministic ruin-only impact plates via `src/game/runtime/impactPlates.ts` and `src/game/runtime/runLayout.ts`, creating a second ruin verb based on hard landings over marked slabs.
  - Extended `src/main.ts` so ruin runs surface impact-plate prompts, detect landing-speed shatters, render slab state in-scene, contribute to exit locks, and export through `render_game_to_text`.
  - Updated objective summaries plus architecture/design docs so ruin nodes no longer read as ordered-relays only.
  - Added `tests/impactPlates.test.ts` plus runtime fixture updates; targeted typecheck and runtime tests pass.

- Expedition-flow extraction / automation pass:
  - Added `src/game/runtime/expeditionFlow.ts` to own node-completion effects, arrival rewards, free-trip refund handling, and the shared "has this node been completed" check instead of leaving that bookkeeping inline in `src/main.ts`.
  - Updated `src/main.ts` to call the extracted helpers for run completion and map travel, reducing renderer-owned gameplay bookkeeping.
  - Added `tests/expeditionFlow.test.ts` to cover a deterministic full loop: complete a node, gain a free trip, travel to a connected node with fuel refund, and apply arrival rewards / notebook progression.
  - Validation: targeted typecheck and loop-focused tests pass.

- Run-objective UI extraction pass:
  - Added `src/game/runtime/runObjectiveUi.ts` to own prompt-priority resolution, compact objective labels, and aggregate objective-progress counts instead of leaving those branches inline in `src/main.ts`.
  - Updated `src/main.ts` to consume a single `runObjectivePrompt(...)` helper for run overlays and shared progress helpers for HUD/exit-lock bookkeeping.
  - Added `tests/runObjectiveUi.test.ts` to cover prompt priority across sync gates, impact plates, canopy lifts, and relay prompts plus aggregate progress totals.
  - Validation: targeted typecheck and objective-ui test slice pass.

- Run-objective update extraction pass:
  - Added `src/game/runtime/runObjectiveUpdates.ts` to own per-frame service-bay, sync-gate, canopy-lift, and impact-plate advancement instead of mutating those systems inline in `stepRun()`.
  - Updated `src/main.ts` to consume one helper result for objective completions/messages during the run step.
  - Added `tests/runObjectiveUpdates.test.ts` to cover combined objective advancement and completion-message ordering in a deterministic runtime fixture.
  - Validation: targeted typecheck and update-helper test slice pass.

- Run-objective visual extraction pass:
  - Added `src/game/runtime/runObjectiveVisuals.ts` to compute objective render emphasis state for service bays, impact plates, canopy lifts, sync gates, and relay labels/highlights instead of recomputing those conditions inline in `drawRunScene()`.
  - Updated `src/main.ts` to draw from the precomputed visual state while keeping Pixi drawing primitives local to the shell.
  - Added `tests/runObjectiveVisuals.test.ts` to cover ordered/steady relay emphasis, anomaly phase highlighting, and canopy/plate visual ratios.
  - Validation: targeted typecheck and visual-helper test slice pass.

- Map-scene content extraction pass:
  - Added `src/game/runtime/mapSceneContent.ts` to own route-detail text, install/scanner/repair hints, notebook field notes, and completion-state copy instead of building that content inline in `drawMapScene()`.
  - Updated `src/main.ts` to render map cards from the extracted content object while keeping panel/card layout local to the Pixi shell.
  - Added `tests/mapSceneContent.test.ts` to cover selected-route copy, scanner/install hints, notebook field notes, and completion-state outcomes.
  - Validation: targeted typecheck and map-content test slice pass.

- Map-board view extraction pass:
  - Added `src/game/runtime/mapBoardView.ts` to own projected node/edge emphasis state plus footer chip labels instead of recomputing those selections inline in `drawMapScene()`.
  - Updated `src/main.ts` to draw the route board from the extracted view model while keeping Pixi primitives local to the shell.
  - Added `tests/mapBoardView.test.ts` to cover selected-edge highlighting, goal/completion emphasis, depth ordering, and expedition-complete chip copy.
  - Validation: targeted typecheck and map-board test slice pass.

- Map-scene layout extraction pass:
  - Added `src/game/runtime/mapSceneLayout.ts` to own lower-card width/wrap/placement and celebration/footer positions instead of hard-coding those coordinates inline in `drawMapScene()`.
  - Updated `src/main.ts` to measure text against helper-provided wrap widths, then place route/notes/celebration cards from the extracted layout object.
  - Added `tests/mapSceneLayout.test.ts` to cover card containment above the footer row and safe-band clamping on tighter screens.
  - Validation: targeted typecheck and layout-focused test slice pass.

TODO next:

- Decide whether notebook clues should start affecting route choice mechanically, for example by revealing pre-arrival scanner/map intel or unlocking authored encounter outcomes.
- Continue breaking remaining scene orchestration out of `src/main.ts`, especially repeated HUD text-reset / draw-primitive plumbing and any remaining scene-specific card layout or module-meter setup.

- Scanner intel pass:
  - Tightened pre-arrival route knowledge so scanner progression now reveals meaningful map decisions in tiers instead of leaking full objective text from the start.
  - `src/engine/sim/exploration.ts` now exposes biome objective visibility alongside benefit/risk visibility; first visits permanently teach that biome's objective pattern.
  - `src/game/runtime/mapSceneContent.ts` now hides selected-route objective summaries behind scanner lv.3 or prior biome experience, and field notes now include the same objective-pattern knowledge tier.
  - Updated `tests/exploration.test.ts` and `tests/mapSceneContent.test.ts`; targeted typecheck plus `tests/exploration.test.ts` and `tests/mapSceneContent.test.ts` pass.

- Notebook triangulation pass:
  - Gave notebook progress a direct route-choice payoff instead of leaving it as flavor-only mystery text.
  - Added `shortestLegCountBetweenNodes(...)` in `src/engine/sim/world.ts` so map-side guidance can reason about seeded graph depth without renderer-owned path logic.
  - Added `notebookSignalRouteIntel(...)` in `src/engine/sim/notebook.ts`; the first clue unlocks selected-route bearing reads, the second unlocks estimated remaining legs to the source, and synthesis marks the strongest currently connected lead.
  - Updated `src/game/runtime/mapSceneContent.ts` so route cards and field notes surface this triangulation tiering alongside the existing scanner-based biome intel.
  - Updated `docs/06-puzzles-and-meta-mystery.md`; targeted notebook/map-content tests and `npm run check` pass.

- Notebook synthesis payoff pass:
  - Extended `notebookSignalRouteIntel(...)` so synthesis now flags when the selected route is the strongest connected lead and unlocks decoded arrival intel for that lead.
  - Updated `src/game/runtime/mapSceneContent.ts` so the strongest synthesized lead can reveal hidden arrival benefit, objective, and risk details before scanner progression would normally expose them.
  - Updated `tests/notebook.test.ts` and `tests/mapSceneContent.test.ts` to pin the stronger-lead decode behavior and verify weaker connected routes stay gated.
  - Updated `docs/06-puzzles-and-meta-mystery.md`; targeted notebook/map-content tests pass.

TODO next:

- Decide whether later notebook payoff should move beyond route intel into authored encounter outcomes or notebook-conditioned goal-node variants.
- Continue breaking remaining scene orchestration out of `src/main.ts`, especially repeated HUD text-reset / draw-primitive plumbing and any remaining scene-specific card layout or module-meter setup.

- Scene HUD content extraction pass:
  - Added `src/game/runtime/sceneHudContent.ts` to own run/map HUD title strings, meta lines, row labels/values, notebook status text, and shared module-label truncation instead of assembling that panel copy inline in `src/main.ts`.
  - Updated `src/main.ts` to consume the extracted run/map HUD content objects and removed unused Pixi `Text` instances that were only being reset every frame.
  - Added `tests/sceneHudContent.test.ts` to cover deterministic run/map HUD copy, notebook synthesis tag output, and trip-count clamping.
  - Updated `IMPLEMENTATION_NOTES.md`; `npm run check` passes.

- Map-scene HUD view extraction pass:
  - Added `src/game/runtime/mapSceneHudView.ts` to own map HUD rows, header placement, fuel/trip meter values, and module-label positioning instead of rebuilding those view details inline in `src/main.ts`.
  - Updated `src/main.ts` to consume the extracted map HUD view model while keeping Pixi drawing primitives local to the shell.
  - Added `tests/mapSceneHudView.test.ts` and updated `IMPLEMENTATION_NOTES.md`.
  - Validation: `npm run typecheck` passes, targeted Vitest slices pass, and `npm run check` reaches `test:e2e` but still cannot launch a Chromium executable in this environment.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially shared HUD/draw helper plumbing like chip composition, overlay-card state, and module-meter placement.
- Decide whether synthesis should eventually do more than route marking, for example unlocking authored encounter outcomes or notebook-conditioned goal-node variants.

- Notebook-conditioned arrival payoff pass:
  - Extended `BiomeKnowledge` in `src/game/state/gameState.ts` with persistent `objectiveKnown` state so route/objective intel can be learned outside pure visit-count or scanner gates.
  - Added `revealBiomeIntel(...)` in `src/engine/sim/exploration.ts` and updated visibility logic so deterministic encounters can permanently teach benefit, objective, and risk intel for a biome.
  - Updated `src/game/runtime/arrivalEncounters.ts` so synthesized first-time town arrivals now bank a free transfer and annotate connected neighboring biome routes using the notebook, giving synthesis a direct route-choice payoff after travel.
  - Updated `tests/exploration.test.ts`, `tests/mapSceneContent.test.ts`, and `tests/expeditionFlow.test.ts`; updated `docs/06-puzzles-and-meta-mystery.md`.

- Scene HUD meter-view extraction pass:
  - Extended `src/game/runtime/sceneHudView.ts` so shared HUD helpers now own module-meter cell positions, level ratios, and condition-color state instead of leaving that grid math in `src/main.ts`.
  - Updated `src/game/runtime/runSceneHudView.ts` and `src/game/runtime/mapSceneHudView.ts` to expose precomputed `moduleMeters` alongside the existing label/header view models.
  - Updated `src/main.ts` to draw subsystem level/condition meters from helper-provided view data instead of rebuilding placement and condition coloring inline.
  - Added targeted assertions in `tests/sceneHudView.test.ts`, `tests/runSceneHudView.test.ts`, and `tests/mapSceneHudView.test.ts`; `npm run typecheck` plus those three Vitest slices pass.

TODO next:

- Keep pushing notebook payoff toward stranger late-game consequences, for example goal-node variants or arrival encounters that alter local run rules instead of only map intel.
- Continue breaking remaining scene orchestration out of `src/main.ts`, especially shared HUD/draw helper plumbing like chip composition and any remaining overlay-card state.

- Notebook goal-run payoff pass:
  - Added `src/game/runtime/goalSignal.ts` so synthesized expedition-goal routes can advertise and apply a deterministic local-run variant instead of staying map-only flavor.
  - Goal-node runs now start with relay `B0` already linked once synthesis is unlocked, and `src/main.ts` applies that primer whenever the current node's run layout is reset.
  - Updated `src/game/runtime/mapSceneContent.ts` so selected expedition-goal routes warn that the source approach begins with a pre-linked relay.
  - Added `tests/goalSignal.test.ts`, extended `tests/mapSceneContent.test.ts`, and updated `docs/06-puzzles-and-meta-mystery.md`.

TODO next:

- Decide whether later notebook payoff should mutate more than one relay/objective on the goal run or branch the actual goal-node encounter by clue mix.
- Continue breaking remaining scene orchestration out of `src/main.ts`, especially shared HUD/draw helper plumbing like chip composition, overlay-card state, and module-meter placement.

- Run-resolution copy extraction pass:
  - Extended `src/game/runtime/runCompletion.ts` so exit-lock summaries and post-run completion messages are assembled in a deterministic helper instead of inline in `src/main.ts`.
  - Updated `src/main.ts` to consume the extracted helpers when the player hits a locked exit or finishes a run, trimming another chunk of scene-owned rule/copy logic out of the Pixi shell.
  - Expanded `tests/runCompletion.test.ts` to cover mixed objective-lock summaries, flawless/non-flawless completion text, notebook-update suffixes, and expedition-end messaging.
  - Updated `IMPLEMENTATION_NOTES.md`; `npm run typecheck` and `npm run test -- runCompletion runSceneView` pass.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially shared HUD/draw helper plumbing like chip composition, overlay-card state, and repeated text-node reset/application work.
- Decide whether later notebook payoff should mutate more than one relay/objective on the goal run or branch the actual goal-node encounter by clue mix.

- Shared chip-row composition extraction pass:
  - Added `src/game/runtime/sceneActionChips.ts` so run/map footer control chips now share one deterministic row-layout helper instead of duplicating scene-local x math.
  - Updated `src/game/runtime/runSceneView.ts` and `src/game/runtime/mapBoardView.ts` to describe chip specs and let the shared helper center or compact them within safe insets on tighter widths.
  - Updated `src/main.ts` to consume the revised run-chip builder signature and added `tests/sceneActionChips.test.ts` plus tighter-width assertions in `tests/runSceneView.test.ts` and `tests/mapBoardView.test.ts`.
  - Updated `IMPLEMENTATION_NOTES.md`; `npm run typecheck` and `npm run test -- sceneActionChips runSceneView mapBoardView` pass.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially shared overlay-card measurement/application work and repeated text-node reset/application plumbing.
- Decide whether later notebook payoff should mutate more than one relay/objective on the goal run or branch the actual goal-node encounter by clue mix.

- Shared text-card measurement extraction pass:
  - Added `src/game/runtime/sceneTextCards.ts` so run/map overlay cards now share one deterministic spec + measured-layout helper instead of duplicating wrap-width and placement math inside `src/main.ts`.
  - Updated `src/game/runtime/runSceneView.ts` and `src/game/runtime/mapSceneCards.ts` to describe overlay/route/notes cards with the shared `SceneTextCardSpec`.
  - Updated `src/main.ts` to apply and measure cards through the shared helper, and collapsed repeated label clearing/module-label application into local helpers.
  - Added `tests/sceneTextCards.test.ts` and updated `IMPLEMENTATION_NOTES.md`.

- Goal-run mystery payoff extension:
  - Extended `src/game/runtime/goalSignal.ts` so the synthesized third-clue assist now pre-solves the first available local secondary objective in addition to its existing primary assist.
  - Goal-route preview text now advertises the stronger payoff, and `tests/goalSignal.test.ts` now covers ruin/service-stop, nature/canopy-lift, and anomaly/sync-gate variants.
  - Updated `docs/06-puzzles-and-meta-mystery.md` and `IMPLEMENTATION_NOTES.md`; targeted goal-signal tests and typecheck pass.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially repeated Pixi text-style/reset plumbing and any remaining scene-local draw helper setup that can move behind testable view models.
- Decide whether the next notebook payoff step should branch the actual goal-node encounter by clue mix now that the synthesized run assist affects more than one target.

- Shared text-view extraction pass:
  - Added `src/game/runtime/sceneTextView.ts` so chip labels, HUD rows, panel headers, beacon labels, module labels, and text-card text state now share one pure view/layout helper instead of rebuilding Pixi text mutation inline in `src/main.ts`.
  - Updated `src/main.ts` to measure/apply those view descriptors through thin local Pixi helpers, trimming repeated style/reset/position logic from both run and map scene draws.
  - Added `tests/sceneTextView.test.ts` and updated `IMPLEMENTATION_NOTES.md`.
  - Validation: `npm run typecheck` passes; `npm run test -- --run tests/sceneTextView.test.ts tests/sceneTextCards.test.ts tests/runSceneHudView.test.ts tests/mapSceneHudView.test.ts` passes.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially any remaining repeated Pixi text reset/application helpers and scene-local draw setup that can move behind testable view models.
- Decide whether the next notebook payoff step should branch the actual goal-node encounter by clue mix now that the synthesized run assist affects more than one target.

- Notebook goal-encounter branching pass:
  - Extended `src/game/runtime/goalSignal.ts` so synthesized expedition-goal runs now carry a deterministic source-signature variant keyed by clue order instead of only a relay primer plus arrival/run bonuses.
  - The first + second clue pair now mutates the actual source approach with effects like lowered relay shelves, breached entry hazards, extra salvage echoes, quieter moving fields, a shortened final approach, or a vented final channel.
  - Updated `src/main.ts` to apply that encounter bonus during run reset, and updated `src/game/runtime/expeditionFlow.ts` plus map preview copy so the arrival message and goal-route card both explain the decoded source signature.
  - Expanded `tests/goalSignal.test.ts` to cover the new preview copy plus representative encounter mutations.

TODO next:

- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.
- Continue breaking remaining scene orchestration out of `src/main.ts`, especially any remaining repeated Pixi text reset/application helpers and scene-local draw setup that can move behind testable view models.

- Map-scene card planning extraction pass:
  - Extended `src/game/runtime/mapSceneCards.ts` with deterministic measurement-card specs plus a `buildMapSceneCardPlan(...)` helper that owns the temporary wrap-width layout, text-card measurement inputs, and final route/notes/celebration card positioning.
  - Updated `src/main.ts` to consume the planned map-card layout/views instead of rebuilding route/notes measurement specs and second-pass layout math inline during `drawMapScene()`.
  - Expanded `tests/mapSceneCards.test.ts` to cover the temporary measurement specs and the measured final card-plan flow, and updated `IMPLEMENTATION_NOTES.md`.
  - Validation: `npm run typecheck` passes; `npm run test -- --run tests/mapSceneCards.test.ts` passes.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially repeated Pixi text reset/application helpers and any remaining scene-local draw setup that can move behind testable view models.
- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.

- Shared text-measurement + Pixi text-helper extraction pass:
  - Added `src/game/runtime/sceneTextMeasure.ts` so card measurement and small batches of text-measurement specs now share one pure helper instead of duplicating first-pass/second-pass wrap logic across scene assemblies and `src/main.ts`.
  - Added `src/game/render/pixiText.ts` so Pixi `Text` mutation/reset/measurement lives outside `src/main.ts`, leaving the shell to consume shared helpers rather than owning the low-level text-node plumbing directly.
  - Updated `src/game/runtime/runSceneTextAssembly.ts`, `src/game/runtime/mapSceneTextAssembly.ts`, and `src/main.ts` to use the shared measurement helpers.
  - Added `tests/sceneTextMeasure.test.ts`.
  - Validation: `npm run typecheck` passes; `npm run test -- tests/sceneTextMeasure.test.ts tests/runSceneTextAssembly.test.ts tests/mapSceneTextAssembly.test.ts tests/sceneTextView.test.ts` passes.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially shared draw-primitive helpers like panel/gauge/module-meter rendering and any remaining scene-local draw setup that can move behind reusable helpers.
- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.

- Shared Pixi draw-primitive extraction pass:
  - Added `src/game/render/pixiPrimitives.ts` so shared panel, gauge, pip, chip, module-meter, and text-card drawing now lives outside `src/main.ts`.
  - Updated `src/main.ts` to import those helpers and keep the run/map scene functions focused on orchestration and scene-specific geometry.
  - Added `tests/pixiPrimitives.test.ts` with recorder-based coverage for gauge clamping, shared primitive styling, module-meter stacking, and text-card measurement/application.
  - Updated `IMPLEMENTATION_NOTES.md`.
  - Validation: `npm run typecheck` passes; `npm run test -- --run tests/pixiPrimitives.test.ts tests/sceneHudView.test.ts tests/runSceneTextAssembly.test.ts tests/mapSceneTextAssembly.test.ts` passes.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially any repeated scene-local draw setup that can move behind reusable render helpers or testable view builders.
- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.

- Map-board render extraction pass:
  - Added `src/game/render/mapBoardRenderer.ts` so the map scene's edge/node drawing lives outside `src/main.ts` and consumes the existing deterministic `MapBoardView`.
  - Updated `src/main.ts` to call `drawMapBoard(...)` instead of owning the board-edge, glow, outline, and goal-star loops inline.
  - Added `tests/mapBoardRenderer.test.ts` with recorder-based coverage for edge ordering, decorated-node accent order, and the stronger current-node glow alpha.
  - Validation: `npm run check` passes in this environment; browser smoke scripts still report the existing Chromium-launch skips but exit successfully.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially remaining frame-reset/setup helpers like shared scene text-node clearing and other scene-local backdrop/setup code.
- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.

- Run-scene render extraction pass:
  - Added `src/game/render/runSceneRenderer.ts` so the remaining map backdrop, run backdrop/terrain, hazard, damage-feedback, and avatar draw passes now live outside `src/main.ts`.
  - Updated `src/main.ts` to import the shared render helpers and keep the scene functions focused on orchestration, HUD assembly, and state-driven draw ordering.
  - Added `tests/runSceneRenderer.test.ts` with recorder coverage for backdrop guides, biome terrain accents, hazard-shape variants, damage overlay rendering, and avatar presentation state.
  - Updated `IMPLEMENTATION_NOTES.md`.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially remaining frame-reset/setup helpers like shared scene text-node clearing and any other repeated scene-local setup work.
- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.

- Shared scene-text reset extraction pass:
  - Extended `src/game/render/pixiText.ts` with single-label and grouped-label reset helpers so scene entry can clear Pixi text state through one helper instead of repeating parallel `label.text = ''` lists in `src/main.ts`.
  - Updated `src/main.ts` to use the shared reset helper at the start of both run/map draws and to clear overlay/celebration labels through the same text-helper layer.
  - Added `tests/pixiText.test.ts` for grouped reset behavior and extra-label clearing, and updated `IMPLEMENTATION_NOTES.md`.

TODO next:

- Continue breaking remaining scene orchestration out of `src/main.ts`, especially other repeated frame/setup work that can move behind render helpers once text-reset duplication is gone.
- Decide whether a later notebook slice should branch the actual expedition-goal ending or post-goal encounter text, now that the source approach itself varies by clue order.
