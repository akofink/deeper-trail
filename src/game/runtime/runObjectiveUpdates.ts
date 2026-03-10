import type { RuntimeState } from './runtimeState';
import { isInsideCanopyLift, updateCanopyLiftProgress } from './canopyLifts';
import { canShatterImpactPlate } from './impactPlates';
import {
  ANOMALY_SCAN_LOCK_SECONDS,
  canChargeAnomalyLock,
  isSteadyLinkReady,
  type BeaconRule
} from '../../engine/sim/runObjectives';
import { canStabilizeSyncGate } from './syncGates';
import { updateServiceStopProgress } from './serviceStops';
import { currentNodeType } from '../../engine/sim/world';
import { beaconInteractRadius } from './vehicleDerivedStats';

export interface RunObjectiveUpdateResult {
  message: string | null;
  durationSeconds: number;
}

export interface RunObjectiveUpdateInput {
  dt: number;
  landedThisFrame: boolean;
  landingSpeed: number;
}

export function activeBeaconRule(state: RuntimeState): BeaconRule {
  const nodeType = state.sim.world.nodes.find((node) => node.id === state.sim.currentNodeId)?.type ?? 'town';
  if (nodeType === 'town') return 'steady';
  if (nodeType === 'ruin') return 'ordered';
  if (nodeType === 'nature') return 'airborne';
  if (nodeType === 'anomaly') return 'boosted';
  return 'standard';
}

export function updateRunObjectives(state: RuntimeState, input: RunObjectiveUpdateInput): RunObjectiveUpdateResult {
  const px = state.player.x + state.player.w * 0.5;
  const py = state.player.y + state.player.h * 0.5;
  const steadyReady = isSteadyLinkReady(Math.abs(state.player.vx), !state.player.onGround);
  const nodeType = currentNodeType(state.sim);
  const interactRadius = beaconInteractRadius(state);
  const playerBounds = {
    x: state.player.x,
    y: state.player.y,
    w: state.player.w,
    h: state.player.h
  };

  let message: string | null = null;
  let durationSeconds = 0;

  if (nodeType === 'anomaly' && state.sim.vehicle.scanner >= 2) {
    for (let index = 0; index < state.beacons.length; index += 1) {
      const beacon = state.beacons[index];
      if (beacon.activated || beacon.scanLocked) continue;
      const rr = (beacon.r + interactRadius) * (beacon.r + interactRadius);
      const inRange = (beacon.x - px) * (beacon.x - px) + (beacon.y - py) * (beacon.y - py) <= rr;
      const canCharge = inRange && canChargeAnomalyLock(Math.abs(state.player.vx), state.dashBoost, state.elapsedSeconds, index);

      if (canCharge) {
        beacon.scanProgress = Math.min((beacon.scanProgress ?? 0) + input.dt, ANOMALY_SCAN_LOCK_SECONDS);
        if (beacon.scanProgress >= ANOMALY_SCAN_LOCK_SECONDS) {
          beacon.scanLocked = true;
          beacon.scanProgress = ANOMALY_SCAN_LOCK_SECONDS;
          message = `Relay ${beacon.id.toUpperCase()} locked.`;
          durationSeconds = 1.8;
        }
        continue;
      }

      beacon.scanProgress = inRange ? Math.max(0, (beacon.scanProgress ?? 0) - input.dt) : 0;
    }
  }

  for (const stop of state.serviceStops) {
    const inZone = Math.abs(px - stop.x) <= stop.w * 0.5;
    const update = updateServiceStopProgress(stop, input.dt, inZone, steadyReady);
    if (update.completedNow) {
      state.score += 20;
      message = `Bay ${stop.id.toUpperCase()} calibrated.`;
      durationSeconds = 2.2;
    }
  }

  for (let index = 0; index < state.syncGates.length; index += 1) {
    const gate = state.syncGates[index];
    if (gate.stabilized) continue;
    const result = canStabilizeSyncGate(gate, index, playerBounds, Math.abs(state.player.vx), state.dashBoost, state.elapsedSeconds);
    if (!result.canStabilize) continue;
    gate.stabilized = true;
    state.score += 20;
    message = `Gate ${gate.id.toUpperCase()} stabilized.`;
    durationSeconds = 2.2;
  }

  for (const lift of state.canopyLifts) {
    const inZone = isInsideCanopyLift(lift, playerBounds);
    const update = updateCanopyLiftProgress(lift, input.dt, inZone, !state.player.onGround);
    if (update.completedNow) {
      state.score += 20;
      message = `Lift ${lift.id.toUpperCase()} charted.`;
      durationSeconds = 2.2;
    }
  }

  for (const plate of state.impactPlates) {
    if (!canShatterImpactPlate(plate, px, input.landingSpeed, input.landedThisFrame)) continue;
    plate.shattered = true;
    state.score += 20;
    message = `Plate ${plate.id.toUpperCase()} shattered.`;
    durationSeconds = 2.2;
  }

  return { message, durationSeconds };
}
