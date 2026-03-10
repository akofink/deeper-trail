import type { GameState as SimState } from '../state/gameState';
import type { Beacon, CanopyLift, ImpactPlate, ServiceStop, SyncGate } from '../state/runObjectives';

export type Mode = 'playing' | 'paused' | 'won' | 'lost';
export type Scene = 'run' | 'map';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  invuln: number;
  coyoteTime: number;
  jumpBufferTime: number;
  facing: -1 | 1;
}

export interface Collectible {
  x: number;
  y: number;
  r: number;
  collected: boolean;
}

export interface Hazard {
  kind: 'static' | 'moving';
  x: number;
  baseX: number;
  y: number;
  w: number;
  h: number;
  amplitude: number;
  speed: number;
  phase: number;
}

export interface RuntimeState {
  mode: Mode;
  scene: Scene;
  seed: string;
  expeditionGoalNodeId: string;
  expeditionComplete: boolean;
  score: number;
  health: number;
  elapsedSeconds: number;
  mapMessage: string;
  mapMessageTimer: number;
  runPromptText?: string;
  runPromptTimer?: number;
  mapSelectionIndex: number;
  completedNodeIds: string[];
  freeTravelCharges: number;
  dashEnergy: number;
  dashBoost: number;
  dashDirection: -1 | 1;
  wheelRotation: number;
  mapRotation: number;
  mapRotationVelocity: number;
  tookDamageThisRun: boolean;
  shieldChargeAvailable: boolean;
  beacons: Beacon[];
  serviceStops: ServiceStop[];
  syncGates: SyncGate[];
  canopyLifts: CanopyLift[];
  impactPlates: ImpactPlate[];
  player: Player;
  cameraX: number;
  goalX: number;
  groundY: number;
  collectibles: Collectible[];
  hazards: Hazard[];
  sim: SimState;
}
