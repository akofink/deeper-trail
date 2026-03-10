import {
  anomalyLockProgressRatio,
  canActivateBeacon,
  canChargeAnomalyLock,
  getBeaconRuleForNodeType,
  isSteadyLinkReady,
  nextRequiredBeaconIndex
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

export interface StickyRunPrompt {
  text: string;
  timer: number;
}

const STICKY_RUN_PROMPT_SECONDS = 0.55;

function quantizedPercent(progress: number, maxProgress: number): number {
  if (maxProgress <= 0) return 0;
  const percent = Math.max(0, Math.min(100, Math.round((progress / maxProgress) * 100)));
  return Math.max(0, Math.min(100, Math.round(percent / 25) * 25));
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
      ? `Hold steady at bay ${quantizedPercent(stop.progress, SERVICE_STOP_HOLD_SECONDS)}%`
      : !state.player.onGround
        ? 'Touch down and slow for the bay'
        : 'Ease off and settle into the bay';
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
      return `Phase open: cut through ${gate.id.toUpperCase()}`;
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
      ? `Stay airborne in the bloom ${quantizedPercent(lift.progress, 0.6)}%`
      : 'Jump into the bloom and stay airborne';
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
      elapsedSeconds: state.elapsedSeconds,
      scanLocked: beacon.scanLocked
    });

    if (beaconRule === 'boosted' && state.sim.vehicle.scanner >= 2) {
      if (beacon.scanLocked) {
        return state.sim.vehicle.scanner >= 3
          ? 'Relay locked: scanner confirms the link'
          : 'Relay locked: press Enter to confirm';
      }

      if (canChargeAnomalyLock(Math.abs(state.player.vx), state.dashBoost, state.elapsedSeconds, index)) {
        return `Phase open: lock relay ${quantizedPercent(
          anomalyLockProgressRatio(beacon.scanProgress ?? 0),
          1
        )}%`;
      }
    }

    if (activation.canActivate) {
      if (state.sim.vehicle.scanner >= 3) {
        if (beaconRule === 'boosted') return 'Keep boosting through the relay to auto-link';
        if (beaconRule === 'airborne') return 'Jump through the relay to auto-link';
        if (beaconRule === 'steady') return 'Hold steady beside the relay to auto-link';
        return 'Stay in range and the scanner will auto-link';
      }
      if (beaconRule === 'ordered') return `Press Enter to link relay ${beacon.id.toUpperCase()}`;
      if (beaconRule === 'boosted') return 'Boost through the relay, then press Enter';
      if (beaconRule === 'airborne') return 'Jump through the relay, then press Enter';
      if (beaconRule === 'steady') return 'Hold steady and press Enter';
      return 'Press Enter to link the relay';
    }

    if (beaconRule === 'steady') {
      return !state.player.onGround ? 'Touch down before linking the relay' : 'Ease off before linking the relay';
    }

    if (beaconRule === 'ordered') {
      const requiredIndex = nextRequiredBeaconIndex(state.beacons);
      const nextBeacon = state.beacons[requiredIndex];
      return `Link relay ${nextBeacon?.id.toUpperCase() ?? 'NEXT'} first`;
    }

    if (beaconRule === 'boosted') {
      const enoughSpeed = Math.abs(state.player.vx) >= 260 || state.dashBoost >= 0.2;
      return enoughSpeed ? 'Hold boost and wait for the phase' : 'Need more speed or boost for this relay';
    }

    if (beaconRule === 'airborne') {
      return 'Jump through the relay to link it';
    }

    return 'Relay in range';
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

export function updateStickyRunPrompt(
  nextPrompt: string | null,
  previousText: string | undefined,
  previousTimer: number | undefined,
  dt: number
): StickyRunPrompt {
  if (nextPrompt) {
    return {
      text: nextPrompt,
      timer: STICKY_RUN_PROMPT_SECONDS
    };
  }

  const timer = Math.max(0, (previousTimer ?? 0) - dt);
  return {
    text: timer > 0 ? previousText ?? '' : '',
    timer
  };
}
