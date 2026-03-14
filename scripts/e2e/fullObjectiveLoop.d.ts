import type fs from "node:fs";
import type { Browser, Page } from "playwright";

export interface BeaconApproachTarget {
  kind: "beacon";
  id: string;
  x: number;
  y: number;
}

export interface BeaconApproachStateInput {
  run: {
    player: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface BeaconApproachResult {
  dx: number;
  dy: number;
  distance: number;
  inRange: boolean;
  shouldBrake: boolean;
  shouldCreep: boolean;
}

export interface AirborneBeaconApproachTarget {
  kind: "beacon";
  id: string;
  x: number;
  y: number;
}

export interface AirborneBeaconApproachStateInput {
  run: {
    player: {
      x: number;
      y: number;
      width: number;
      height: number;
      onGround: boolean;
      vx: number;
    };
  };
}

export interface AirborneBeaconApproachResult {
  dx: number;
  dy: number;
  distance: number;
  inRange: boolean;
  nearX: boolean;
  shouldJump: boolean;
  shouldActivate: boolean;
  shouldBrake: boolean;
  shouldCreep: boolean;
}

export interface SyncGateApproachTarget {
  kind: "syncGate";
  id: string;
  x: number;
  width: number;
  height: number;
}

export interface SyncGateApproachStateInput {
  run: {
    player: {
      x: number;
      width: number;
    };
  };
  stats: {
    elapsedSeconds: number;
  };
}

export interface SyncGateApproachResult {
  dx: number;
  beforeGate: boolean;
  windowOpen: boolean;
}

export interface ImpactPlateJumpStateInput {
  run: {
    player: {
      x: number;
      width: number;
    };
    impactPlates: Array<{
      id: string;
      x: number;
      width: number;
      shattered: boolean;
    }>;
  };
}

export interface DirectoryEntryLike {
  isDirectory(): boolean;
  name: string;
}

export interface ObjectiveLoopSmokeConfig {
  name: "town" | "ruin" | "nature" | "anomaly";
  label: string;
  logLabel: string;
  passLabel: string;
  skipLabel: string;
  seed: string;
  nodeType: string;
  objectiveKey: "serviceStops" | "impactPlates" | "canopyLifts" | "syncGates";
  objectiveLabel: string;
  resetFlag: "serviced" | "shattered" | "charted" | "stabilized";
  completeRun(page: Page): Promise<unknown>;
}

export interface ObjectiveLoopRunOptions {
  browser?: Browser;
  candidatePaths?: string[];
  launchBrowser?: (candidatePaths: string[]) => Promise<Browser>;
  runSmoke?: (smoke: ObjectiveLoopSmokeConfig, browser: Browser) => Promise<object | null>;
  log?: (message: string) => void;
  now?: () => number;
}

export interface ObjectiveLoopTimingEntry {
  smoke: ObjectiveLoopSmokeConfig["name"];
  durationMs: number;
}

export function logStep(message: string): void;
export function formatObjectiveLoopTimingSummary(
  selection: ObjectiveLoopSmokeConfig["name"] | "all",
  timings: ObjectiveLoopTimingEntry[],
  totalDurationMs: number
): string;
export function parseSmokeSelection(argv?: string[]): "town" | "ruin" | "nature" | "anomaly" | "all";
export function withStepTimeout<T>(step: string, operation: () => Promise<T>, timeoutMs?: number): Promise<T>;
export function findPlaywrightCacheExecutables(
  cacheRoot?: string,
  existsSync?: (path: fs.PathLike) => boolean,
  readdirSync?: (path: fs.PathLike, options: { withFileTypes: true }) => DirectoryEntryLike[]
): string[];
export function isSkippableBrowserLaunchError(error: unknown): boolean;
export function resolveExecutablePath(explicitPath?: string, managedPath?: string, fallbackCandidates?: string[]): string | undefined;
export function resolveExecutablePathCandidates(explicitPath?: string, managedPath?: string, fallbackCandidates?: string[]): string[];
export function beaconApproachState(target: BeaconApproachTarget, state: BeaconApproachStateInput): BeaconApproachResult;
export function isPhaseWindowOpen(elapsedSeconds: number, objectiveIndex: number): boolean;
export function impactPlateJumpWindow(state: ImpactPlateJumpStateInput): ImpactPlateJumpStateInput["run"]["impactPlates"][number] | undefined;
export function airborneBeaconApproachState(target: AirborneBeaconApproachTarget, state: AirborneBeaconApproachStateInput): AirborneBeaconApproachResult;
export function syncGateApproachState(target: SyncGateApproachTarget, state: SyncGateApproachStateInput, gateIndex: number): SyncGateApproachResult;
export function assert(condition: boolean, message: string, state?: unknown): void;
export function advanceFrames(page: Page, frames: number): Promise<void>;
export function tapKey(page: Page, key: string, frames?: number): Promise<void>;
export function launchBrowserWithFallback(candidatePaths: string[]): Promise<Browser>;
export const OBJECTIVE_LOOP_SMOKES: Record<ObjectiveLoopSmokeConfig["name"], ObjectiveLoopSmokeConfig>;
export function resolveObjectiveLoopSmoke(smokeName: ObjectiveLoopSmokeConfig["name"]): ObjectiveLoopSmokeConfig;
export function runObjectiveLoopSmoke(smoke: ObjectiveLoopSmokeConfig, options?: ObjectiveLoopRunOptions): Promise<object | null>;
export function runSelectedObjectiveLoopSmokes(
  selection: ObjectiveLoopSmokeConfig["name"] | "all",
  options?: Omit<ObjectiveLoopRunOptions, "browser">
): Promise<object[]>;
