import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assert,
  completeNatureRun,
  isSkippableBrowserLaunchError,
  launchBrowserWithFallback,
  logStep,
  resolveExecutablePathCandidates,
  withStepTimeout,
  advanceFrames,
  tapKey
} from "./fullObjectiveLoop.js";

const NATURE_SEED = "e2e-2";
const DEFAULT_VIEWPORT = { width: 1440, height: 960 };
const PLAYWRIGHT_STEP_TIMEOUT_MS = 30_000;

async function main() {
  const executableCandidates = resolveExecutablePathCandidates();
  logStep(`launching nature biome browser smoke for seed ${NATURE_SEED}`);

  let browser;
  try {
    browser = await launchBrowserWithFallback(executableCandidates);
  } catch (error) {
    if (isSkippableBrowserLaunchError(error)) {
      logStep(`skipping nature smoke: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
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
    url.searchParams.set("seed", NATURE_SEED);

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

    const initialState = JSON.parse(
      await withStepTimeout("reading initial state", () =>
        page.evaluate(() => window.render_game_to_text())
      )
    );
    assert(initialState.scene === "run", "Nature smoke should start in the run scene", initialState);
    assert(initialState.sim.seed === NATURE_SEED, "Nature smoke run loaded the wrong seed", initialState);
    assert(initialState.sim.currentNodeType === "nature", "Nature smoke seed must start on a nature node", initialState);
    assert(initialState.run.canopyLifts.length === 2, "Nature smoke expects canopy-lift objectives", initialState);

    logStep("running nature fixed-seed objective loop");
    const completedState = await completeNatureRun(page);
    assert(completedState.scene === "map", "Node completion should return to the map scene", completedState);
    assert(completedState.map.travelUnlockedAtCurrentNode, "Completed node should unlock outbound travel", completedState);
    assert(completedState.map.freeTravelCharges === 1, "Completed node should grant one free travel charge", completedState);
    assert(
      completedState.map.message.includes("Trail complete"),
      "Completion banner should report the trail sync message",
      completedState
    );

    await tapKey(page, "Enter", 2);
    await advanceFrames(page, 10);

    const traveledState = JSON.parse(
      await withStepTimeout("reading post-travel state", () =>
        page.evaluate(() => window.render_game_to_text())
      )
    );
    assert(traveledState.scene === "run", "Travel should return to the run scene", traveledState);
    assert(traveledState.sim.currentNodeId !== completedState.sim.currentNodeId, "Travel should move to a connected node", traveledState);
    assert(traveledState.run.beacons.every((b) => !b.activated), "New run should reset relay progress", traveledState);
    assert(
      traveledState.run.canopyLifts.every((l) => !l.charted),
      "New run should reset canopy-lift progress",
      traveledState
    );

    if (consoleErrors.length > 0) {
      throw new Error(`Nature browser smoke hit console errors:\n${consoleErrors.join("\n")}`);
    }

    console.log(
      JSON.stringify(
        {
          seed: NATURE_SEED,
          completedNodeId: completedState.sim.currentNodeId,
          traveledNodeId: traveledState.sim.currentNodeId,
          completionMessage: completedState.map.message
        },
        null,
        2
      )
    );
    logStep("nature browser smoke passed");
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
