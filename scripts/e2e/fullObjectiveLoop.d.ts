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

export function logStep(message: string): void;
export function withStepTimeout<T>(step: string, operation: () => Promise<T>, timeoutMs?: number): Promise<T>;
export function resolveExecutablePath(explicitPath?: string, managedPath?: string, fallbackCandidates?: string[]): string | undefined;
export function resolveExecutablePathCandidates(explicitPath?: string, managedPath?: string, fallbackCandidates?: string[]): string[];
export function beaconApproachState(target: BeaconApproachTarget, state: BeaconApproachStateInput): BeaconApproachResult;
