import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  beaconApproachState,
  findPlaywrightCacheExecutables,
  isSkippableBrowserLaunchError,
  resolveExecutablePath,
  resolveExecutablePathCandidates,
  withStepTimeout
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
});
