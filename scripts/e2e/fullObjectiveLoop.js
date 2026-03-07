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
const OBJECTIVE_LOOP_TIMEOUT_MS = 45_000;
const PROGRESS_LOG_INTERVAL_TICKS = 300;
const FALLBACK_CHROMIUM_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
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

function assert(condition, message, state) {
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

  return unique([managedPath, ...fallbackCandidates]).filter((candidate) => fs.existsSync(candidate));
}

async function launchBrowser(executablePath) {
  return chromium.launch({
    headless: process.env.E2E_HEADLESS !== "0",
    executablePath,
    args: ["--allow-file-access-from-files", "--use-gl=angle", "--use-angle=swiftshader"]
  });
}

async function launchBrowserWithFallback(candidatePaths) {
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

async function advanceFrames(page, frames) {
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

async function tapKey(page, key, frames = 2) {
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
  const browser = await launchBrowserWithFallback(executableCandidates);

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
          arrivalMessage: traveledState.map.message
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

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
