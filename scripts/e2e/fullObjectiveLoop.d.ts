import type fs from "node:fs";

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

export interface DirectoryEntryLike {
  isDirectory(): boolean;
  name: string;
}

export function logStep(message: string): void;
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
