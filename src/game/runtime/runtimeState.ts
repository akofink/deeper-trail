import { currentNodeType, expeditionGoalNodeId } from '../../engine/sim/world';
import { getMaxHealth } from '../../engine/sim/vehicle';
import { createInitialGameState } from '../state/gameState';
import type { GameState as SimState } from '../state/gameState';
import type { Beacon, CanopyLift, ImpactPlate, ServiceStop, SyncGate } from '../state/runObjectives';
import { applyGoalSignalEncounterBonus, applyGoalSignalPrimer, applyGoalSignalRunBonus } from './goalSignal';
import { buildRunLayout } from './runLayout';
import { rechargeShieldCharge } from './shieldCharge';

export type Mode = 'playing' | 'paused' | 'won' | 'lost';
export type Scene = 'run' | 'map';
export type GoalRouteHookType =
  | 'relay-credit'
  | 'breach-fuel'
  | 'salvage-echo'
  | 'quiet-heal'
  | 'folded-hop'
  | 'vented-shield';

export interface LegacyCarryOver {
  type: GoalRouteHookType;
  note: string;
  sourceTitle: string;
}

export const START_X = 80;
export const PLAYER_W = 34;
export const PLAYER_H = 44;
export const GROUND_Y_RATIO = 0.74;
export const COYOTE_TIME = 0.11;
export const JUMP_BUFFER_TIME = 0.12;
export const MEDPATCH_SCRAP_COST = 2;
export const MEDPATCH_HEAL_AMOUNT = 1;

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
  kind: 'static' | 'sweeper' | 'stomper' | 'pulsing';
  x: number;
  baseX: number;
  y: number;
  baseY: number;
  w: number;
  baseW: number;
  h: number;
  baseH: number;
  amplitudeX: number;
  amplitudeY: number;
  pulse: number;
  speed: number;
  phase: number;
}

export interface DamageFeedback {
  kind: 'health' | 'shield';
  timer: number;
  duration: number;
  worldX: number;
  worldY: number;
  direction: -1 | 1;
}

export interface RuntimeState {
  mode: Mode;
  scene: Scene;
  seed: string;
  expeditionGoalNodeId: string;
  expeditionComplete: boolean;
  postGoalRouteHookType?: GoalRouteHookType | null;
  postGoalRouteHookCharges?: number;
  postGoalRouteHookNote?: string;
  legacyCarryOverType?: GoalRouteHookType | null;
  legacyCarryOverNote?: string;
  legacyCarryOverSourceTitle?: string;
  score: number;
  health: number;
  elapsedSeconds: number;
  mapMessage: string;
  mapMessageTimer: number;
  runPromptText?: string;
  runPromptTimer?: number;
  mapSelectionIndex: number;
  mapInstallSelectionIndex?: number;
  lastTravel?:
    | {
        destinationNodeId: string;
        fuelCost: number;
        usedFreeTravel: boolean;
        freeTravelChargesBefore: number;
        freeTravelChargesAfter: number;
        fuelBefore: number;
        fuelAfterTravel: number;
        arrivalNodeType?: string;
      }
    | null;
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
  damageFeedback?: DamageFeedback;
  sim: SimState;
}

export interface MedPatchResult {
  didHeal: boolean;
  reason?: string;
}

export function groundYForCanvasHeight(canvasHeight: number): number {
  return Math.round(canvasHeight * GROUND_Y_RATIO);
}

export function canUseMedPatch(state: RuntimeState): boolean {
  return state.health < getMaxHealth(state.sim.vehicle) && state.sim.scrap >= MEDPATCH_SCRAP_COST;
}

export function tryUseMedPatch(state: RuntimeState): MedPatchResult {
  const maxHealth = getMaxHealth(state.sim.vehicle);
  if (state.health >= maxHealth) {
    return { didHeal: false, reason: 'Hull integrity already at max HP' };
  }

  if (state.sim.scrap < MEDPATCH_SCRAP_COST) {
    return { didHeal: false, reason: `Need ${MEDPATCH_SCRAP_COST} scrap for a med patch` };
  }

  state.sim.scrap -= MEDPATCH_SCRAP_COST;
  state.health = Math.min(maxHealth, state.health + MEDPATCH_HEAL_AMOUNT);
  return { didHeal: true };
}

export function createInitialRuntimeState(canvasHeight: number, seed: string, legacyCarryOver?: LegacyCarryOver): RuntimeState {
  const sim = createInitialGameState(seed);
  const groundY = groundYForCanvasHeight(canvasHeight);
  const run = buildRunLayout(groundY, currentNodeType(sim));
  const maxHealth = getMaxHealth(sim.vehicle);

  return {
    mode: 'playing',
    scene: 'run',
    seed,
    expeditionGoalNodeId: expeditionGoalNodeId(sim),
    expeditionComplete: false,
    postGoalRouteHookType: null,
    postGoalRouteHookCharges: 0,
    postGoalRouteHookNote: '',
    legacyCarryOverType: legacyCarryOver?.type ?? null,
    legacyCarryOverNote: legacyCarryOver?.note ?? '',
    legacyCarryOverSourceTitle: legacyCarryOver?.sourceTitle ?? '',
    score: 0,
    health: maxHealth,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    runPromptText: '',
    runPromptTimer: 0,
    mapSelectionIndex: 0,
    mapInstallSelectionIndex: 0,
    lastTravel: null,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 1,
    dashBoost: 0,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: -0.22,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    shieldChargeAvailable: sim.vehicle.shielding >= 2,
    damageFeedback: undefined,
    player: {
      x: START_X,
      y: groundY - PLAYER_H,
      vx: 0,
      vy: 0,
      w: PLAYER_W,
      h: PLAYER_H,
      onGround: true,
      invuln: 0,
      coyoteTime: COYOTE_TIME,
      jumpBufferTime: 0,
      facing: 1
    },
    cameraX: 0,
    goalX: run.goalX,
    groundY,
    collectibles: run.collectibles,
    hazards: run.hazards,
    beacons: run.beacons,
    serviceStops: run.serviceStops,
    syncGates: run.syncGates,
    canopyLifts: run.canopyLifts,
    impactPlates: run.impactPlates,
    sim
  };
}

export function resetRunFromCurrentNode(state: RuntimeState): void {
  const run = buildRunLayout(state.groundY, currentNodeType(state.sim));
  state.mode = 'playing';
  state.player.x = START_X;
  state.player.y = state.groundY - state.player.h;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.onGround = true;
  state.player.invuln = 0;
  state.cameraX = 0;
  state.damageFeedback = undefined;
  state.goalX = run.goalX;
  state.collectibles = run.collectibles;
  state.hazards = run.hazards;
  state.beacons = run.beacons;
  state.serviceStops = run.serviceStops;
  state.syncGates = run.syncGates;
  state.canopyLifts = run.canopyLifts;
  state.impactPlates = run.impactPlates;
  applyGoalSignalPrimer(state);
  applyGoalSignalEncounterBonus(state);
  applyGoalSignalRunBonus(state);
  state.dashEnergy = 1;
  state.dashBoost = 0;
  state.wheelRotation = 0;
  state.tookDamageThisRun = false;
  state.runPromptText = '';
  state.runPromptTimer = 0;
  rechargeShieldCharge(state);
  if (!state.expeditionComplete) {
    state.mode = 'playing';
  }
}

export function shiftRunSceneVertical(state: RuntimeState, deltaY: number): void {
  if (deltaY === 0) {
    return;
  }

  state.player.y += deltaY;
  for (const hazard of state.hazards) {
    hazard.y += deltaY;
    hazard.baseY += deltaY;
  }
  for (const collectible of state.collectibles) {
    collectible.y += deltaY;
  }
  for (const beacon of state.beacons) {
    beacon.y += deltaY;
  }
  for (const lift of state.canopyLifts) {
    lift.y += deltaY;
  }
}
