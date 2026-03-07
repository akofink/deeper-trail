import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveExecutablePath, resolveExecutablePathCandidates, withStepTimeout } from "../scripts/e2e/fullObjectiveLoop.js";

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

  it("fails slow operations with a named timeout", async () => {
    await expect(withStepTimeout("test step", () => new Promise(() => {}), 10)).rejects.toThrow(
      "test step exceeded 10ms"
    );
  });
});
