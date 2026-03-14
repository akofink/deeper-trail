import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const E2E_SEED = "e2e-1";
const DEFAULT_VIEWPORT = { width: 1440, height: 960 };
const INTERACT_RADIUS = 55;
const BRAKE_DISTANCE = 140;
const CREEP_DISTANCE = 28;
const JUMP_MIN_DISTANCE = 58;
const JUMP_MAX_DISTANCE = 108;
const LOW_SPEED = 80;
const SERVICE_HOLD_FRAMES = 48;
const MAX_TICKS = 9000;
const PLAYWRIGHT_STEP_TIMEOUT_MS = 30_000;
const OBJECTIVE_LOOP_TIMEOUT_MS = 90_000;
const PROGRESS_LOG_INTERVAL_TICKS = 300;
const PHASE_LINK_PERIOD_SECONDS = 1.6;
const PHASE_LINK_OPEN_SECONDS = 0.48;
const PHASE_LINK_OFFSET_SECONDS = 0.23;
const GATE_APPROACH_DISTANCE = 180;
const FALLBACK_CHROMIUM_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
];
const PLAYWRIGHT_CACHE_ROOT = path.join(process.env.HOME ?? "", "Library", "Caches", "ms-playwright");
const PLAYWRIGHT_CACHE_EXECUTABLE_SUFFIXES = [
  path.join("chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
  path.join(
    "chrome-mac-arm64",
    "Google Chrome for Testing.app",
    "Contents",
    "MacOS",
    "Google Chrome for Testing"
  ),
  path.join("chrome-linux", "chrome"),
  path.join("chrome-win", "chrome.exe"),
  path.join("chrome-win64", "chrome.exe")
];

export function logStep(message) {
  console.log(`[e2e] ${message}`);
}

export async function withStepTimeout(step, operation, timeoutMs = PLAYWRIGHT_STEP_TIMEOUT_MS) {
  let timeoutHandle;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${step} exceeded ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    globalThis.clearTimeout(timeoutHandle);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function findPlaywrightCacheExecutables(
  cacheRoot = PLAYWRIGHT_CACHE_ROOT,
  existsSync = fs.existsSync,
  readdirSync = fs.readdirSync
) {
  if (!cacheRoot || !existsSync(cacheRoot)) {
    return [];
  }

  let entries = [];
  try {
    entries = readdirSync(cacheRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
    .map((entry) => PLAYWRIGHT_CACHE_EXECUTABLE_SUFFIXES.map((suffix) => path.join(cacheRoot, entry.name, suffix)))
    .flat()
    .filter((candidate) => existsSync(candidate))
    .sort()
    .reverse();
}

export function assert(condition, message, state) {
  if (condition) return;

  const debugState = state
    ? JSON.stringify(
        {
          scene: state.scene,
          mode: state.mode,
          node: state.sim?.currentNodeId,
          nodeType: state.sim?.currentNodeType,
          day: state.sim?.day,
          health: state.stats?.health,
          mapMessage: state.map?.message,
          player: state.run?.player
        },
        null,
        2
      )
    : "unavailable";
  throw new Error(`${message}\nState snapshot:\n${debugState}`);
}

export function resolveExecutablePath(
  explicitPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim(),
  managedPath = chromium.executablePath(),
  fallbackCandidates = FALLBACK_CHROMIUM_CANDIDATES
) {
  if (explicitPath) {
    return fs.existsSync(explicitPath) ? explicitPath : undefined;
  }
  if (managedPath && fs.existsSync(managedPath)) {
    return managedPath;
  }
  return fallbackCandidates.find((candidate) => fs.existsSync(candidate));
}

export function resolveExecutablePathCandidates(
  explicitPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim(),
  managedPath = chromium.executablePath(),
  fallbackCandidates = FALLBACK_CHROMIUM_CANDIDATES
) {
  if (explicitPath) {
    return fs.existsSync(explicitPath) ? [explicitPath] : [];
  }

  return unique([managedPath, ...findPlaywrightCacheExecutables(), ...fallbackCandidates]).filter((candidate) =>
    fs.existsSync(candidate)
  );
}

export function isSkippableBrowserLaunchError(error) {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes("Please run the following command to download new browsers") ||
    detail.includes("Crashpad/settings.dat: Operation not permitted") ||
    (detail.includes("bootstrap_check_in") && detail.includes("Permission denied (1100)"))
  );
}

async function launchBrowser(executablePath) {
  return chromium.launch({
    headless: process.env.E2E_HEADLESS !== "0",
    executablePath,
    args: ["--allow-file-access-from-files", "--use-gl=angle", "--use-angle=swiftshader"]
  });
}

export async function launchBrowserWithFallback(candidatePaths) {
  if (candidatePaths.length === 0) {
    return launchBrowser(undefined);
  }

  const errors = [];
  for (const executablePath of candidatePaths) {
    try {
      logStep(`trying Chromium executable: ${executablePath}`);
      return await launchBrowser(executablePath);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`- ${executablePath}: ${detail}`);
      logStep(`Chromium launch failed for ${executablePath}`);
    }
  }

  throw new Error(`Unable to launch browser smoke with any detected Chromium executable:\n${errors.join("\n")}`);
}

async function readState(page) {
  return withStepTimeout("reading runtime state", () =>
    page.evaluate(() => {
      if (typeof window.render_game_to_text !== "function") {
        throw new Error("window.render_game_to_text is unavailable");
      }
      return JSON.parse(window.render_game_to_text());
    })
  );
}

export async function advanceFrames(page, frames) {
  await withStepTimeout(`advancing ${frames} frame(s)`, () =>
    page.evaluate((count) => {
      if (typeof window.advanceTime !== "function") {
        throw new Error("window.advanceTime is unavailable");
      }
      for (let index = 0; index < count; index += 1) {
        window.advanceTime(1000 / 60);
      }
    }, frames)
  );
}

export async function tapKey(page, key, frames = 2) {
  await withStepTimeout(`pressing ${key}`, () => page.keyboard.down(key));
  await advanceFrames(page, frames);
  await withStepTimeout(`releasing ${key}`, () => page.keyboard.up(key));
}

async function releaseAll(page, activeKeys) {
  for (const key of activeKeys) {
    await withStepTimeout(`releasing ${key}`, () => page.keyboard.up(key));
  }
  activeKeys.clear();
}

async function setHeld(page, activeKeys, key, nextHeld) {
  const isHeld = activeKeys.has(key);
  if (nextHeld && !isHeld) {
    await page.keyboard.down(key);
    activeKeys.add(key);
  } else if (!nextHeld && isHeld) {
    await page.keyboard.up(key);
    activeKeys.delete(key);
  }
}

function targetSequence(state) {
  return [
    ...state.run.beacons.map((beacon) => ({ kind: "beacon", id: beacon.id, x: beacon.x, y: beacon.y })),
    ...state.run.serviceStops.map((stop) => ({ kind: "service", id: stop.id, x: stop.x, width: stop.width }))
  ].sort((left, right) => left.x - right.x);
}

function currentTarget(sequence, state) {
  for (const item of sequence) {
    if (item.kind === "beacon") {
      const beacon = state.run.beacons.find((candidate) => candidate.id === item.id);
      if (beacon && !beacon.activated) return { ...item, activated: beacon.activated };
    } else {
      const stop = state.run.serviceStops.find((candidate) => candidate.id === item.id);
      if (stop && !stop.serviced) return { ...item, serviced: stop.serviced, progress: stop.progress };
    }
  }
  return { kind: "goal", x: state.run.world.goalX };
}

function jumpWindow(state) {
  const playerRight = state.run.player.x + state.run.player.width;
  return state.run.visibleHazards.find((hazard) => {
    const dx = hazard.x - playerRight;
    return dx >= JUMP_MIN_DISTANCE && dx <= JUMP_MAX_DISTANCE;
  });
}

export function beaconApproachState(target, state) {
  const player = state.run.player;
  const playerCenterX = player.x + player.width * 0.5;
  const playerCenterY = player.y + player.height * 0.5;
  const dx = target.x - playerCenterX;
  const dy = target.y - playerCenterY;
  const distance = Math.hypot(dx, dy);
  const inRange = distance <= INTERACT_RADIUS;
  const shouldCreep = !inRange && Math.abs(dx) <= CREEP_DISTANCE;
  const shouldBrake = !inRange && !shouldCreep && dx <= BRAKE_DISTANCE;

  return {
    dx,
    dy,
    distance,
    inRange,
    shouldBrake,
    shouldCreep
  };
}

async function completeTownRun(page) {
  const activeKeys = new Set();
  const sequence = targetSequence(await readState(page));
  const loopStart = Date.now();

  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    if (Date.now() - loopStart > OBJECTIVE_LOOP_TIMEOUT_MS) {
      throw new Error(`Town run smoke exceeded ${OBJECTIVE_LOOP_TIMEOUT_MS}ms without completing`);
    }

    const state = await readState(page);
    assert(state.mode === "playing", "Run smoke hit a non-playing state before completion", state);

    if (state.scene === "map") {
      await releaseAll(page, activeKeys);
      return state;
    }

    const player = state.run.player;
    const playerCenterX = player.x + player.width * 0.5;
    const speed = Math.abs(player.vx);
    const target = currentTarget(sequence, state);

    if (tick > 0 && tick % PROGRESS_LOG_INTERVAL_TICKS === 0) {
      const elapsedSeconds = ((Date.now() - loopStart) / 1000).toFixed(1);
      logStep(
        `objective loop heartbeat tick=${tick} elapsed=${elapsedSeconds}s scene=${state.scene} playerX=${playerCenterX.toFixed(1)} target=${target.kind}`
      );
    }

    if (player.onGround && jumpWindow(state)) {
      await setHeld(page, activeKeys, "ArrowRight", true);
      await tapKey(page, "Space", 7);
      continue;
    }

    if (target.kind === "beacon") {
      const approach = beaconApproachState(target, state);

      if (approach.inRange && player.onGround && speed <= LOW_SPEED) {
        await setHeld(page, activeKeys, "ArrowRight", false);
        await tapKey(page, "Enter", 2);
        await advanceFrames(page, 8);
        continue;
      }

      await setHeld(page, activeKeys, "ArrowRight", !approach.shouldBrake || approach.shouldCreep);
      await advanceFrames(page, approach.shouldBrake && !approach.shouldCreep ? 3 : 2);
      continue;
    }

    if (target.kind === "service") {
      const dx = target.x - playerCenterX;
      const zoneHalfWidth = target.width * 0.5 - 8;
      const inZone = Math.abs(dx) <= zoneHalfWidth;

      if (inZone && player.onGround && speed <= LOW_SPEED) {
        await setHeld(page, activeKeys, "ArrowRight", false);
        await advanceFrames(page, SERVICE_HOLD_FRAMES);
        continue;
      }

      const shouldBrake = dx <= BRAKE_DISTANCE || inZone;
      await setHeld(page, activeKeys, "ArrowRight", !shouldBrake);
      await advanceFrames(page, shouldBrake ? 3 : 2);
      continue;
    }

    await setHeld(page, activeKeys, "ArrowRight", true);
    await advanceFrames(page, 2);
  }

  throw new Error(`Town run smoke exceeded ${MAX_TICKS} control ticks without completing`);
}

async function main() {
  const executablePath = resolveExecutablePath();
  const executableCandidates = resolveExecutablePathCandidates();
  logStep(`launching browser smoke for seed ${E2E_SEED}`);
  if (executablePath) {
    logStep(`preferred Chromium executable: ${executablePath}`);
  } else {
    logStep("using Playwright launch defaults");
  }
  let browser;
  try {
    browser = await launchBrowserWithFallback(executableCandidates);
  } catch (error) {
    if (isSkippableBrowserLaunchError(error)) {
      logStep(`skipping browser smoke: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
      return;
    }
    throw error;
  }

  const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(String(error));
  });

  try {
    const distIndex = path.resolve(process.cwd(), "dist/index.html");
    const url = pathToFileURL(distIndex);
    url.searchParams.set("seed", E2E_SEED);

    logStep("opening built client bundle");
    await withStepTimeout("opening built client bundle", () =>
      page.goto(url.toString(), { waitUntil: "load", timeout: PLAYWRIGHT_STEP_TIMEOUT_MS })
    );
    logStep("waiting for debug replay hooks");
    await withStepTimeout("waiting for debug replay hooks", () =>
      page.waitForFunction(() => typeof window.render_game_to_text === "function" && typeof window.advanceTime === "function", {
        timeout: PLAYWRIGHT_STEP_TIMEOUT_MS
      })
    );
    await advanceFrames(page, 10);

    const initialState = await readState(page);
    assert(initialState.scene === "run", "Smoke should start in the run scene", initialState);
    assert(initialState.sim.seed === E2E_SEED, "Smoke run loaded the wrong seed", initialState);
    assert(initialState.sim.currentNodeType === "town", "Smoke seed must start on a town node", initialState);
    assert(initialState.run.serviceStops.length === 2, "Town smoke expects service-bay objectives", initialState);

    logStep("running fixed-seed objective loop");
    const completedState = await completeTownRun(page);
    assert(completedState.scene === "map", "Node completion should return to the map scene", completedState);
    assert(completedState.map.travelUnlockedAtCurrentNode, "Completed node should unlock outbound travel", completedState);
    assert(completedState.map.freeTravelCharges === 1, "Completed node should grant one free travel charge", completedState);
    assert(completedState.sim.day === 1, "Completing the first node should advance the day once", completedState);
    assert(
      completedState.map.message.includes("Trail complete"),
      "Completion banner should report the trail sync message",
      completedState
    );

    await tapKey(page, "Enter", 2);
    await advanceFrames(page, 10);

    logStep("verifying post-travel state");
    const traveledState = await readState(page);
    assert(traveledState.map.lastTravel?.usedFreeTravel, "Travel should consume the stored free-trip charge", traveledState);
    assert(traveledState.map.lastTravel?.freeTravelChargesBefore === 1, "Travel should start with one stored free-trip charge", traveledState);
    assert(traveledState.map.lastTravel?.freeTravelChargesAfter === 0, "Travel should spend the stored free-trip charge", traveledState);
    assert(
      traveledState.map.lastTravel?.fuelAfterTravel === completedState.sim.fuel,
      "Free-trip travel should refund the route fuel cost before arrival rewards",
      traveledState
    );
    assert(traveledState.scene === "run", "Travel should return the runtime shell to the run scene", traveledState);
    assert(traveledState.sim.currentNodeId !== completedState.sim.currentNodeId, "Travel should move to a connected node", traveledState);
    assert(traveledState.sim.day === 2, "Travel should advance the day again", traveledState);
    assert(traveledState.sim.currentNodeType === "town", "Smoke route should land on the neighboring town node", traveledState);
    assert(
      traveledState.map.message.includes("fuel topped up"),
      "Arrival rewards should keep the route/map message in sync after travel",
      traveledState
    );
    assert(traveledState.run.beacons.every((beacon) => !beacon.activated), "New run should reset relay progress", traveledState);
    assert(
      traveledState.run.serviceStops.every((stop) => !stop.serviced),
      "New run should reset service-bay progress",
      traveledState
    );

    if (consoleErrors.length > 0) {
      throw new Error(`Browser smoke hit console errors:\n${consoleErrors.join("\n")}`);
    }

    console.log(
      JSON.stringify(
        {
          seed: E2E_SEED,
          completedNodeId: completedState.sim.currentNodeId,
          traveledNodeId: traveledState.sim.currentNodeId,
          completionMessage: completedState.map.message,
          arrivalMessage: traveledState.map.message,
          lastTravel: traveledState.map.lastTravel
        },
        null,
        2
      )
    );
    logStep("browser smoke passed");
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Phase-window helper (mirrors engine logic in src/engine/sim/runObjectives.ts)
// ---------------------------------------------------------------------------

export function isPhaseWindowOpen(elapsedSeconds, objectiveIndex) {
  const phaseTime = (elapsedSeconds + objectiveIndex * PHASE_LINK_OFFSET_SECONDS) % PHASE_LINK_PERIOD_SECONDS;
  return phaseTime < PHASE_LINK_OPEN_SECONDS;
}

// ---------------------------------------------------------------------------
// Impact-plate jump helper (ruin biome)
// ---------------------------------------------------------------------------

export function impactPlateJumpWindow(state) {
  const playerRight = state.run.player.x + state.run.player.width;
  return state.run.impactPlates.find((plate) => {
    if (plate.shattered) return false;
    const plateLeft = plate.x - plate.width * 0.5;
    const dx = plateLeft - playerRight;
    return dx >= JUMP_MIN_DISTANCE && dx <= JUMP_MAX_DISTANCE + 15;
  });
}

// ---------------------------------------------------------------------------
// Airborne-beacon approach helper (nature biome)
// ---------------------------------------------------------------------------

export function airborneBeaconApproachState(target, state) {
  const player = state.run.player;
  const playerCenterX = player.x + player.width * 0.5;
  const playerCenterY = player.y + player.height * 0.5;
  const dx = target.x - playerCenterX;
  const dy = target.y - playerCenterY;
  const distance = Math.hypot(dx, dy);
  const inRange = distance <= INTERACT_RADIUS;
  const nearX = Math.abs(dx) <= INTERACT_RADIUS;
  const shouldJump = nearX && player.onGround;
  const shouldActivate = inRange && !player.onGround;
  const shouldBrake = !nearX && dx > 0 && dx <= BRAKE_DISTANCE;
  const shouldCreep = !nearX && dx > 0 && dx <= CREEP_DISTANCE;
  return { dx, dy, distance, inRange, nearX, shouldJump, shouldActivate, shouldBrake, shouldCreep };
}

// ---------------------------------------------------------------------------
// Sync-gate approach helper (anomaly biome)
// ---------------------------------------------------------------------------

export function syncGateApproachState(target, state, gateIndex) {
  const player = state.run.player;
  const playerRight = player.x + player.width;
  const gateLeft = target.x - target.width * 0.5;
  const dx = gateLeft - playerRight;
  const beforeGate = dx > 0 && dx <= GATE_APPROACH_DISTANCE;
  const windowOpen = isPhaseWindowOpen(state.stats.elapsedSeconds, gateIndex);
  return { dx, beforeGate, windowOpen };
}

// ---------------------------------------------------------------------------
// Shared biome target helpers
// ---------------------------------------------------------------------------

function currentBiomeTarget(sequence, state) {
  for (const item of sequence) {
    if (item.kind === "beacon") {
      const beacon = state.run.beacons.find((b) => b.id === item.id);
      if (beacon && !beacon.activated) return { ...item };
    } else if (item.kind === "impactPlate") {
      const plate = state.run.impactPlates.find((p) => p.id === item.id);
      if (plate && !plate.shattered) return { ...item };
    } else if (item.kind === "canopyLift") {
      const lift = state.run.canopyLifts.find((l) => l.id === item.id);
      if (lift && !lift.charted) return { ...item };
    } else if (item.kind === "syncGate") {
      const gate = state.run.syncGates.find((g) => g.id === item.id);
      if (gate && !gate.stabilized) return { ...item };
    }
  }
  return { kind: "goal", x: state.run.world.goalX };
}

// ---------------------------------------------------------------------------
// Ruin run completer — ordered relays + impact plates
// ---------------------------------------------------------------------------

export async function completeRuinRun(page) {
  const activeKeys = new Set();
  let ruinSequence = null;
  const loopStart = Date.now();

  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    if (Date.now() - loopStart > OBJECTIVE_LOOP_TIMEOUT_MS) {
      throw new Error(`Ruin run smoke exceeded ${OBJECTIVE_LOOP_TIMEOUT_MS}ms without completing`);
    }

    const state = await readState(page);
    assert(state.mode === "playing", "Ruin run smoke hit a non-playing state before completion", state);

    if (state.scene === "map") {
      await releaseAll(page, activeKeys);
      return state;
    }

    if (!ruinSequence) {
      ruinSequence = [
        ...state.run.beacons.map((b) => ({ kind: "beacon", id: b.id, x: b.x, y: b.y })),
        ...state.run.impactPlates.map((p) => ({ kind: "impactPlate", id: p.id, x: p.x, width: p.width }))
      ].sort((a, b) => a.x - b.x);
    }

    if (tick > 0 && tick % PROGRESS_LOG_INTERVAL_TICKS === 0) {
      const elapsed = ((Date.now() - loopStart) / 1000).toFixed(1);
      const target = currentBiomeTarget(ruinSequence, state);
      logStep(`ruin loop heartbeat tick=${tick} elapsed=${elapsed}s target=${target.kind} x=${target.x}`);
    }

    const player = state.run.player;
    const target = currentBiomeTarget(ruinSequence, state);

    // Jump to land on an upcoming impact plate (auto-shatters on hard landing)
    if (player.onGround && impactPlateJumpWindow(state)) {
      await setHeld(page, activeKeys, "ArrowRight", true);
      await tapKey(page, "Space", 7);
      continue;
    }

    // Jump to clear hazards
    if (player.onGround && jumpWindow(state)) {
      await setHeld(page, activeKeys, "ArrowRight", true);
      await tapKey(page, "Space", 7);
      continue;
    }

    if (target.kind === "beacon") {
      const approach = beaconApproachState(target, state);
      if (approach.inRange && player.onGround && Math.abs(player.vx) <= LOW_SPEED) {
        await setHeld(page, activeKeys, "ArrowRight", false);
        await tapKey(page, "Enter", 2);
        await advanceFrames(page, 8);
        continue;
      }
      await setHeld(page, activeKeys, "ArrowRight", !approach.shouldBrake || approach.shouldCreep);
      await advanceFrames(page, approach.shouldBrake && !approach.shouldCreep ? 3 : 2);
      continue;
    }

    // Impact plates shatter automatically on landing — just drive toward them
    await setHeld(page, activeKeys, "ArrowRight", true);
    await advanceFrames(page, 2);
  }

  throw new Error(`Ruin run smoke exceeded ${MAX_TICKS} control ticks without completing`);
}

// ---------------------------------------------------------------------------
// Nature run completer — airborne relays + canopy lifts
// ---------------------------------------------------------------------------

export async function completeNatureRun(page) {
  const activeKeys = new Set();
  let natureSequence = null;
  const loopStart = Date.now();

  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    if (Date.now() - loopStart > OBJECTIVE_LOOP_TIMEOUT_MS) {
      throw new Error(`Nature run smoke exceeded ${OBJECTIVE_LOOP_TIMEOUT_MS}ms without completing`);
    }

    const state = await readState(page);
    assert(state.mode === "playing", "Nature run smoke hit a non-playing state before completion", state);

    if (state.scene === "map") {
      await releaseAll(page, activeKeys);
      return state;
    }

    if (!natureSequence) {
      natureSequence = [
        ...state.run.beacons.map((b) => ({ kind: "beacon", id: b.id, x: b.x, y: b.y })),
        ...state.run.canopyLifts.map((l) => ({ kind: "canopyLift", id: l.id, x: l.x, width: l.width, height: l.height }))
      ].sort((a, b) => a.x - b.x);
    }

    if (tick > 0 && tick % PROGRESS_LOG_INTERVAL_TICKS === 0) {
      const elapsed = ((Date.now() - loopStart) / 1000).toFixed(1);
      const target = currentBiomeTarget(natureSequence, state);
      logStep(`nature loop heartbeat tick=${tick} elapsed=${elapsed}s target=${target.kind} x=${target.x}`);
    }

    const player = state.run.player;
    const target = currentBiomeTarget(natureSequence, state);

    if (target.kind === "beacon") {
      const approach = airborneBeaconApproachState(target, state);

      // Jump to become airborne when close enough to link
      if (approach.shouldJump) {
        await setHeld(page, activeKeys, "ArrowRight", false);
        await tapKey(page, "Space", 3);
        continue;
      }

      // Link the relay while airborne
      if (approach.shouldActivate) {
        await setHeld(page, activeKeys, "ArrowRight", false);
        await tapKey(page, "Enter", 2);
        await advanceFrames(page, 8);
        continue;
      }

      // Hazard jump while navigating
      if (player.onGround && jumpWindow(state)) {
        await setHeld(page, activeKeys, "ArrowRight", true);
        await tapKey(page, "Space", 7);
        continue;
      }

      await setHeld(page, activeKeys, "ArrowRight", !approach.shouldBrake || approach.shouldCreep);
      await advanceFrames(page, approach.shouldBrake && !approach.shouldCreep ? 3 : 2);
      continue;
    }

    if (target.kind === "canopyLift") {
      const playerRight = player.x + player.width;
      const liftLeft = target.x - target.width * 0.5;
      const dx = liftLeft - playerRight;

      // Jump into the lift zone when approaching — the lift holds the player airborne
      // and auto-charts after 0.6 s of airborne time inside the zone
      if (player.onGround && dx >= JUMP_MIN_DISTANCE && dx <= JUMP_MAX_DISTANCE + 40) {
        await setHeld(page, activeKeys, "ArrowRight", true);
        await tapKey(page, "Space", 7);
        continue;
      }

      // Hazard jump while still on ground
      if (player.onGround && jumpWindow(state)) {
        await setHeld(page, activeKeys, "ArrowRight", true);
        await tapKey(page, "Space", 7);
        continue;
      }

      await setHeld(page, activeKeys, "ArrowRight", true);
      await advanceFrames(page, 2);
      continue;
    }

    // Hazard clearance and goal approach
    if (player.onGround && jumpWindow(state)) {
      await setHeld(page, activeKeys, "ArrowRight", true);
      await tapKey(page, "Space", 7);
      continue;
    }
    await setHeld(page, activeKeys, "ArrowRight", true);
    await advanceFrames(page, 2);
  }

  throw new Error(`Nature run smoke exceeded ${MAX_TICKS} control ticks without completing`);
}

// ---------------------------------------------------------------------------
// Anomaly run completer — boost-sync relays + sync gates
// ---------------------------------------------------------------------------

export async function completeAnomalyRun(page) {
  const activeKeys = new Set();
  let anomalySequence = null;
  const loopStart = Date.now();

  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    if (Date.now() - loopStart > OBJECTIVE_LOOP_TIMEOUT_MS) {
      throw new Error(`Anomaly run smoke exceeded ${OBJECTIVE_LOOP_TIMEOUT_MS}ms without completing`);
    }

    const state = await readState(page);
    assert(state.mode === "playing", "Anomaly run smoke hit a non-playing state before completion", state);

    if (state.scene === "map") {
      await releaseAll(page, activeKeys);
      return state;
    }

    if (!anomalySequence) {
      anomalySequence = [
        ...state.run.beacons.map((b) => ({ kind: "beacon", id: b.id, x: b.x, y: b.y })),
        ...state.run.syncGates.map((g) => ({ kind: "syncGate", id: g.id, x: g.x, width: g.width, height: g.height }))
      ].sort((a, b) => a.x - b.x);
    }

    if (tick > 0 && tick % PROGRESS_LOG_INTERVAL_TICKS === 0) {
      const elapsed = ((Date.now() - loopStart) / 1000).toFixed(1);
      const target = currentBiomeTarget(anomalySequence, state);
      logStep(`anomaly loop heartbeat tick=${tick} elapsed=${elapsed}s target=${target.kind} x=${target.x}`);
    }

    const player = state.run.player;
    const target = currentBiomeTarget(anomalySequence, state);

    if (target.kind === "beacon") {
      const approach = beaconApproachState(target, state);
      const beaconIndex = state.run.beacons.findIndex((b) => b.id === target.id);
      const windowOpen = isPhaseWindowOpen(state.stats.elapsedSeconds, beaconIndex);

      // In range: start a dash burst then link (dashBoost = 0.3 immediately satisfies the
      // BOOST_LINK_DASH_THRESHOLD of 0.2, and we wait for the phase window to be open)
      if (approach.inRange && player.onGround) {
        if (windowOpen) {
          // One-frame Shift burst gives dashBoost ≥ 0.3, then Enter links the relay
          await setHeld(page, activeKeys, "ArrowRight", false);
          await page.keyboard.down("ShiftLeft");
          await advanceFrames(page, 1);
          await tapKey(page, "Enter", 2);
          await page.keyboard.up("ShiftLeft");
          await advanceFrames(page, 8);
          continue;
        }
        // Wait for phase window while stationary
        await setHeld(page, activeKeys, "ArrowRight", false);
        await advanceFrames(page, 2);
        continue;
      }

      // Hazard jump while navigating
      if (player.onGround && jumpWindow(state)) {
        await setHeld(page, activeKeys, "ArrowRight", true);
        await tapKey(page, "Space", 7);
        continue;
      }

      await setHeld(page, activeKeys, "ArrowRight", !approach.shouldBrake || approach.shouldCreep);
      await advanceFrames(page, approach.shouldBrake && !approach.shouldCreep ? 3 : 2);
      continue;
    }

    if (target.kind === "syncGate") {
      const gateIndex = state.run.syncGates.findIndex((g) => g.id === target.id);
      const approach = syncGateApproachState(target, state, gateIndex);

      if (approach.beforeGate) {
        if (approach.windowOpen && player.onGround) {
          // Jump through the gate when the phase window is open — the player enters the
          // gate's y-zone within 3 frames of the jump and stabilises at run speed
          await setHeld(page, activeKeys, "ArrowRight", true);
          await tapKey(page, "Space", 7);
          continue;
        }
        // Wait before the gate for the phase window to open
        await setHeld(page, activeKeys, "ArrowRight", false);
        await advanceFrames(page, 2);
        continue;
      }

      // Before the approach window: drive toward the gate
      if (approach.dx > GATE_APPROACH_DISTANCE) {
        if (player.onGround && jumpWindow(state)) {
          await setHeld(page, activeKeys, "ArrowRight", true);
          await tapKey(page, "Space", 7);
          continue;
        }
        await setHeld(page, activeKeys, "ArrowRight", true);
        await advanceFrames(page, 2);
        continue;
      }

      // Passed the gate zone: continue to next target
      await setHeld(page, activeKeys, "ArrowRight", true);
      await advanceFrames(page, 2);
      continue;
    }

    // Hazard clearance and goal approach
    if (player.onGround && jumpWindow(state)) {
      await setHeld(page, activeKeys, "ArrowRight", true);
      await tapKey(page, "Space", 7);
      continue;
    }
    await setHeld(page, activeKeys, "ArrowRight", true);
    await advanceFrames(page, 2);
  }

  throw new Error(`Anomaly run smoke exceeded ${MAX_TICKS} control ticks without completing`);
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
