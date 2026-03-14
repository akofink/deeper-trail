import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Browser } from "playwright";

import {
  beaconApproachState,
  findPlaywrightCacheExecutables,
  isSkippableBrowserLaunchError,
  parseSmokeSelection,
  resolveObjectiveLoopSmoke,
  runObjectiveLoopSmoke,
  runSelectedObjectiveLoopSmokes,
  resolveExecutablePath,
  resolveExecutablePathCandidates,
  withStepTimeout,
  isPhaseWindowOpen,
  impactPlateJumpWindow,
  airborneBeaconApproachState,
  syncGateApproachState
} from "../scripts/e2e/fullObjectiveLoop.js";

const ORIGINAL_EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

describe("fullObjectiveLoop helpers", () => {
  afterEach(() => {
    if (ORIGINAL_EXECUTABLE_PATH === undefined) {
      delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    } else {
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = ORIGINAL_EXECUTABLE_PATH;
    }

    vi.restoreAllMocks();
  });

  it("parses smoke selection from CLI args and rejects unknown names", () => {
    expect(parseSmokeSelection([])).toBe("town");
    expect(parseSmokeSelection(["--smoke", "nature"])).toBe("nature");
    expect(parseSmokeSelection(["--smoke", "all"])).toBe("all");
    expect(() => parseSmokeSelection(["--smoke", "bogus"])).toThrow('Unknown objective loop smoke "bogus"');
  });

  it("resolves known smoke configs by name", () => {
    expect(resolveObjectiveLoopSmoke("town")).toMatchObject({
      name: "town",
      seed: "e2e-1",
      objectiveKey: "serviceStops"
    });
    expect(resolveObjectiveLoopSmoke("anomaly")).toMatchObject({
      name: "anomaly",
      seed: "e2e-3",
      objectiveKey: "syncGates"
    });
    expect(() => resolveObjectiveLoopSmoke("bogus" as "town")).toThrow('Unknown objective loop smoke "bogus"');
  });

  it("uses only an explicit browser override path", () => {
    expect(resolveExecutablePath(undefined, "", [])).toBeUndefined();

    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(resolveExecutablePath("/tmp/does-not-exist", "/tmp/managed", ["/tmp/fallback"])).toBeUndefined();

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    expect(resolveExecutablePath("/tmp/chromium", "/tmp/managed", ["/tmp/fallback"])).toBe("/tmp/chromium");
    expect(resolveExecutablePath(undefined, "/tmp/managed", ["/tmp/fallback"])).toBe("/tmp/managed");
  });

  it("falls back to common local Chromium installs", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((candidate) => candidate === "/tmp/fallback");

    expect(resolveExecutablePath(undefined, "/tmp/missing-managed", ["/tmp/fallback"])).toBe("/tmp/fallback");
  });

  it("tries managed Chromium before local fallbacks", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((candidate) => candidate === "/tmp/managed" || candidate === "/tmp/fallback");

    expect(resolveExecutablePathCandidates(undefined, "/tmp/managed", ["/tmp/fallback", "/tmp/managed"])).toEqual([
      "/tmp/managed",
      "/tmp/fallback"
    ]);
  });

  it("finds installed Playwright Chromium binaries from the local cache", () => {
    const readdirSync = vi.fn(() => [
      { isDirectory: () => true, name: "chromium-1193" },
      { isDirectory: () => true, name: "firefox-1490" }
    ]);
    const existsSync = vi.fn((candidate) =>
      String(candidate) === "/tmp/ms-playwright" ||
      String(candidate).endsWith("/chromium-1193/chrome-mac/Chromium.app/Contents/MacOS/Chromium")
    );

    expect(findPlaywrightCacheExecutables("/tmp/ms-playwright", existsSync, readdirSync)).toEqual([
      "/tmp/ms-playwright/chromium-1193/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
    ]);
  });

  it("fails slow operations with a named timeout", async () => {
    await expect(withStepTimeout("test step", () => new Promise(() => {}), 10)).rejects.toThrow(
      "test step exceeded 10ms"
    );
  });

  it("marks sandboxed browser launch failures as skippable", () => {
    expect(
      isSkippableBrowserLaunchError(
        new Error("open /Users/example/Library/Application Support/Chromium/Crashpad/settings.dat: Operation not permitted")
      )
    ).toBe(true);
    expect(
      isSkippableBrowserLaunchError(
        new Error("Looks like Playwright Test or Playwright was just installed or updated. Please run the following command to download new browsers")
      )
    ).toBe(true);
    expect(isSkippableBrowserLaunchError(new Error("some other browser crash"))).toBe(false);
  });

  it("keeps creeping toward elevated beacons until the true interact radius is reached", () => {
    const approach = beaconApproachState(
      { kind: "beacon", id: "b0", x: 360, y: 302 },
      {
        run: {
          player: {
            x: 321,
            y: 342,
            width: 32,
            height: 36
          }
        }
      }
    );

    expect(approach.inRange).toBe(false);
    expect(approach.shouldBrake).toBe(false);
    expect(approach.shouldCreep).toBe(true);
    expect(Math.round(approach.distance)).toBe(62);
  });

  it("reports phase window as open only within the correct periodic interval", () => {
    // Period = 1.6 s, window = 0.48 s, offset per index = 0.23 s
    expect(isPhaseWindowOpen(0, 0)).toBe(true);    // t=0 index 0: phaseTime=0, in window
    expect(isPhaseWindowOpen(0.47, 0)).toBe(true); // just before window closes
    expect(isPhaseWindowOpen(0.48, 0)).toBe(false); // window closed
    expect(isPhaseWindowOpen(1.6, 0)).toBe(true);   // next period opens again
    // Index offset shifts the window start: index 1 → phaseTime = (t + 0.23) % 1.6
    expect(isPhaseWindowOpen(0, 1)).toBe(true);   // 0 + 0.23 = 0.23 < 0.48 → open
    expect(isPhaseWindowOpen(0.25, 1)).toBe(false); // 0.25 + 0.23 = 0.48 → window just closed
    // Window is closed after the open interval
    expect(isPhaseWindowOpen(0.25, 0)).toBe(true);  // 0.25 < 0.48 → open
    expect(isPhaseWindowOpen(0.5, 0)).toBe(false);  // 0.5 >= 0.48 → closed
  });

  it("finds an impact plate in the jump approach window for ruin runs", () => {
    const state = {
      run: {
        player: { x: 500, width: 34 },
        impactPlates: [
          { id: "ip0", x: 630, width: 112, shattered: false },
          { id: "ip1", x: 1710, width: 120, shattered: true }
        ]
      }
    };

    // playerRight = 534; plate left = 630 - 56 = 574; dx = 574 - 534 = 40 — below JUMP_MIN_DISTANCE(58)
    expect(impactPlateJumpWindow(state)).toBeUndefined();

    // Move player closer: playerRight = 516; dx = 574 - 516 = 58 — exactly at min
    const stateAtMin = { run: { player: { x: 482, width: 34 }, impactPlates: state.run.impactPlates } };
    expect(impactPlateJumpWindow(stateAtMin)).toMatchObject({ id: "ip0" });

    // Shattered plates are skipped
    const allShattered = {
      run: {
        player: { x: 482, width: 34 },
        impactPlates: [{ id: "ip0", x: 630, width: 112, shattered: true }]
      }
    };
    expect(impactPlateJumpWindow(allShattered)).toBeUndefined();
  });

  it("signals a jump when the player is horizontally close to an airborne beacon", () => {
    const target = { kind: "beacon" as const, id: "b0", x: 360, y: 652 };

    // Player on ground, horizontally within INTERACT_RADIUS (55) of beacon
    const onGroundClose = {
      run: {
        player: { x: 326, y: 666, width: 34, height: 44, onGround: true, vx: 0 }
      }
    };
    const approach = airborneBeaconApproachState(target, onGroundClose);
    expect(approach.shouldJump).toBe(true);
    expect(approach.shouldActivate).toBe(false);

    // Player airborne, within full 3-D interact radius
    const airborneClose = {
      run: {
        player: { x: 326, y: 630, width: 34, height: 44, onGround: false, vx: 0 }
      }
    };
    const approachAirborne = airborneBeaconApproachState(target, airborneClose);
    expect(approachAirborne.shouldJump).toBe(false);
    expect(approachAirborne.shouldActivate).toBe(true);
  });

  it("correctly reports whether a sync gate is in the approach window and phase is open", () => {
    const target = { kind: "syncGate" as const, id: "sg0", x: 680, width: 62, height: 88 };
    // gateLeft = 649; player before gate by 100 px → dx = 649 - (549+34) = 66 → beforeGate=true
    const stateBefore = {
      run: { player: { x: 549, width: 34 } },
      stats: { elapsedSeconds: 0 } // phase window open at t=0, index=0
    };
    const a = syncGateApproachState(target, stateBefore, 0);
    expect(a.beforeGate).toBe(true);
    expect(a.windowOpen).toBe(true);

    // Phase window closed
    const stateClosed = {
      run: { player: { x: 549, width: 34 } },
      stats: { elapsedSeconds: 0.5 } // 0.5 >= 0.48, window closed for index 0
    };
    const b = syncGateApproachState(target, stateClosed, 0);
    expect(b.beforeGate).toBe(true);
    expect(b.windowOpen).toBe(false);

    // Player past the gate — not in approach window
    const statePast = {
      run: { player: { x: 720, width: 34 } },
      stats: { elapsedSeconds: 0 }
    };
    const c = syncGateApproachState(target, statePast, 0);
    expect(c.beforeGate).toBe(false);
  });

  it("reuses one launched browser across the selected smoke suite", async () => {
    const browser = { close: vi.fn() } as unknown as Browser;
    const launchBrowser = vi.fn<(candidatePaths: string[]) => Promise<Browser>>(async () => browser);
    const runSmoke = vi.fn(async (smoke: { name: string }, calledBrowser: Browser) => ({ smoke: smoke.name, browser: calledBrowser }));

    const results = await runSelectedObjectiveLoopSmokes("all", {
      candidatePaths: ["/tmp/chromium"],
      launchBrowser,
      runSmoke
    });

    expect(launchBrowser).toHaveBeenCalledTimes(1);
    expect(launchBrowser).toHaveBeenCalledWith(["/tmp/chromium"]);
    expect(runSmoke.mock.calls.map(([smoke, calledBrowser]) => [smoke.name, calledBrowser])).toEqual([
      ["town", browser],
      ["ruin", browser],
      ["nature", browser],
      ["anomaly", browser]
    ]);
    expect(results).toEqual([
      { smoke: "town", browser },
      { smoke: "ruin", browser },
      { smoke: "nature", browser },
      { smoke: "anomaly", browser }
    ]);
    expect((browser.close as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it("launches and closes an owned browser for a single smoke when one is not provided", async () => {
    const browser = { close: vi.fn() } as unknown as Browser;
    const smoke = resolveObjectiveLoopSmoke("town");
    const launchBrowser = vi.fn<(candidatePaths: string[]) => Promise<Browser>>(async () => browser);
    const runSmoke = vi.fn(async () => ({ smoke: "town" }));

    const result = await runObjectiveLoopSmoke(smoke, {
      candidatePaths: ["/tmp/chromium"],
      launchBrowser,
      runSmoke
    });

    expect(launchBrowser).toHaveBeenCalledTimes(1);
    expect(runSmoke).toHaveBeenCalledWith(smoke, browser);
    expect((browser.close as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ smoke: "town" });
  });

  it("returns an empty result set when a shared browser launch is skippable", async () => {
    const launchBrowser = vi.fn(async () => {
      throw new Error(
        "Looks like Playwright Test or Playwright was just installed or updated. Please run the following command to download new browsers"
      );
    });
    const runSmoke = vi.fn();

    const results = await runSelectedObjectiveLoopSmokes("all", {
      candidatePaths: ["/tmp/chromium"],
      launchBrowser,
      runSmoke
    });

    expect(results).toEqual([]);
    expect(runSmoke).not.toHaveBeenCalled();
  });
});
