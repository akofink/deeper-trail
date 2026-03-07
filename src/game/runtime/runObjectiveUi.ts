import {
  canActivateBeacon,
  getBeaconRuleForNodeType,
  getBeaconRuleLabel,
  isSteadyLinkReady
} from '../../engine/sim/runObjectives';
import { currentNodeType } from '../../engine/sim/world';
import { isInsideCanopyLift, totalCanopyLiftProgress, usesCanopyLifts } from './canopyLifts';
import { impactPlatePrompt, totalImpactPlateProgress, usesImpactPlates } from './impactPlates';
import type { RuntimeState } from './runtimeState';
import { SERVICE_STOP_HOLD_SECONDS, totalServiceStopProgress, usesServiceStops } from './serviceStops';
import { canStabilizeSyncGate, totalSyncGateProgress, usesSyncGates } from './syncGates';
import { beaconInteractRadius } from './vehicleDerivedStats';

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export interface RunObjectiveProgress {
  completed: number;
  total: number;
  beaconsRemaining: number;
  serviceStopsRemaining: number;
  syncGatesRemaining: number;
  canopyLiftsRemaining: number;
  impactPlatesRemaining: number;
}

function serviceStopPromptText(state: RuntimeState): string | null {
  if (state.scene !== 'run' || state.mode !== 'playing' || !usesServiceStops(currentNodeType(state.sim))) {
    return null;
  }

  const px = state.player.x + state.player.w * 0.5;
  const ready = isSteadyLinkReady(Math.abs(state.player.vx), !state.player.onGround);
  for (const stop of state.serviceStops) {
    if (stop.serviced) continue;
    if (Math.abs(px - stop.x) > stop.w * 0.5) continue;

    return ready
      ? `Service bay aligned.\nHold steady to finish inspection ${Math.round((stop.progress / SERVICE_STOP_HOLD_SECONDS) * 100)}%.`
      : !state.player.onGround
        ? 'Service bay unstable.\nSettle on the road to start inspection.'
        : 'Service bay unstable.\nEase off and hold a low speed to start inspection.';
  }

  return null;
}

function syncGatePromptText(state: RuntimeState): string | null {
  if (state.scene !== 'run' || state.mode !== 'playing' || !usesSyncGates(currentNodeType(state.sim))) {
    return null;
  }

  const bounds = {
    x: state.player.x,
    y: state.player.y,
    w: state.player.w,
    h: state.player.h
  };
  for (let index = 0; index < state.syncGates.length; index += 1) {
    const gate = state.syncGates[index];
    const result = canStabilizeSyncGate(
      gate,
      index,
      bounds,
      Math.abs(state.player.vx),
      state.dashBoost,
      state.elapsedSeconds
    );

    if (result.canStabilize) {
      return `Sync gate open.\nCut through ${gate.id.toUpperCase()} with speed or boost.`;
    }

    if (result.reason) {
      return result.reason;
    }
  }

  return null;
}

function canopyLiftPromptText(state: RuntimeState): string | null {
  if (state.scene !== 'run' || state.mode !== 'playing' || !usesCanopyLifts(currentNodeType(state.sim))) {
    return null;
  }

  const bounds = {
    x: state.player.x,
    y: state.player.y,
    w: state.player.w,
    h: state.player.h
  };
  for (const lift of state.canopyLifts) {
    if (lift.charted || !isInsideCanopyLift(lift, bounds)) continue;

    return !state.player.onGround
      ? `Canopy draft engaged.\nHold in the bloom to chart ${Math.round((lift.progress / 0.6) * 100)}%.`
      : 'Canopy draft dormant.\nJump into the bloom and stay airborne to chart it.';
  }

  return null;
}

function impactPlatePromptText(state: RuntimeState): string | null {
  if (state.scene !== 'run' || state.mode !== 'playing' || !usesImpactPlates(currentNodeType(state.sim))) {
    return null;
  }

  const px = state.player.x + state.player.w * 0.5;
  for (const plate of state.impactPlates) {
    const prompt = impactPlatePrompt(plate, px, state.player.onGround);
    if (prompt) return prompt;
  }

  return null;
}

function beaconPromptText(state: RuntimeState): string | null {
  if (state.scene !== 'run' || state.mode !== 'playing') {
    return null;
  }

  const px = state.player.x + state.player.w * 0.5;
  const py = state.player.y + state.player.h * 0.5;
  const interactRadius = beaconInteractRadius(state);
  const nodeType = currentNodeType(state.sim);
  const beaconRule = getBeaconRuleForNodeType(nodeType);

  for (let index = 0; index < state.beacons.length; index += 1) {
    const beacon = state.beacons[index];
    if (beacon.activated) continue;
    const rr = (beacon.r + interactRadius) * (beacon.r + interactRadius);
    if (distanceSq(px, py, beacon.x, beacon.y) > rr) continue;

    const activation = canActivateBeacon({
      nodeType,
      beaconIndex: index,
      beacons: state.beacons,
      currentSpeed: Math.abs(state.player.vx),
      dashBoost: state.dashBoost,
      isAirborne: !state.player.onGround,
      elapsedSeconds: state.elapsedSeconds
    });

    if (activation.canActivate) {
      if (state.sim.vehicle.scanner >= 3) {
        if (beaconRule === 'boosted') return 'Signal relay in range.\nKeep boosting through an open sync window.';
        if (beaconRule === 'airborne') return 'Signal relay in range.\nJump through it to auto-link.';
        if (beaconRule === 'steady') return 'Signal relay in range.\nHold steady beside it to auto-link.';
        return 'Signal relay in range.\nScanner will auto-link it.';
      }
      if (beaconRule === 'ordered') return `Signal relay in range.\nPress Enter to link ${beacon.id.toUpperCase()}.`;
      if (beaconRule === 'boosted') return 'Sync window open.\nBoost through it, then press Enter.';
      if (beaconRule === 'airborne') return 'Signal relay in range.\nJump through it, then press Enter.';
      if (beaconRule === 'steady') return 'Relay stabilized.\nPress Enter while holding steady.';
      return 'Signal relay in range.\nPress Enter to link it.';
    }

    return activation.reason ?? getBeaconRuleLabel(nodeType);
  }

  return null;
}

export function objectiveShortLabel(nodeType: string): string {
  const rule = getBeaconRuleForNodeType(nodeType);
  if (rule === 'steady') return 'OBJ STEADY';
  if (rule === 'ordered') return 'OBJ ORDER';
  if (rule === 'airborne') return 'OBJ AIR';
  if (rule === 'boosted') return 'OBJ BOOST';
  return 'OBJ LINK';
}

export function runObjectiveProgress(state: RuntimeState): RunObjectiveProgress {
  const beaconProgress = {
    completed: state.beacons.filter((beacon) => beacon.activated).length,
    total: state.beacons.length
  };
  const serviceStopProgress = totalServiceStopProgress(state.serviceStops);
  const syncGateProgress = totalSyncGateProgress(state.syncGates);
  const canopyLiftProgress = totalCanopyLiftProgress(state.canopyLifts);
  const impactPlateProgress = totalImpactPlateProgress(state.impactPlates);

  return {
    completed:
      beaconProgress.completed +
      serviceStopProgress.completed +
      syncGateProgress.completed +
      canopyLiftProgress.completed +
      impactPlateProgress.completed,
    total:
      beaconProgress.total +
      serviceStopProgress.total +
      syncGateProgress.total +
      canopyLiftProgress.total +
      impactPlateProgress.total,
    beaconsRemaining: beaconProgress.total - beaconProgress.completed,
    serviceStopsRemaining: serviceStopProgress.total - serviceStopProgress.completed,
    syncGatesRemaining: syncGateProgress.total - syncGateProgress.completed,
    canopyLiftsRemaining: canopyLiftProgress.total - canopyLiftProgress.completed,
    impactPlatesRemaining: impactPlateProgress.total - impactPlateProgress.completed
  };
}

export function runObjectivePrompt(state: RuntimeState): string | null {
  return (
    syncGatePromptText(state) ??
    impactPlatePromptText(state) ??
    canopyLiftPromptText(state) ??
    serviceStopPromptText(state) ??
    beaconPromptText(state)
  );
}
