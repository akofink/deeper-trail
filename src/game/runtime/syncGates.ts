import { isPhaseWindowOpen } from '../../engine/sim/runObjectives';
import type { SyncGate } from '../state/runObjectives';

const SYNC_GATE_MIN_SPEED = 210;
const SYNC_GATE_MIN_DASH_BOOST = 0.18;

function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function usesSyncGates(nodeType: string): boolean {
  return nodeType === 'anomaly';
}

export function syncGateReady(currentSpeed: number, dashBoost: number): boolean {
  return currentSpeed >= SYNC_GATE_MIN_SPEED || dashBoost >= SYNC_GATE_MIN_DASH_BOOST;
}

export function totalSyncGateProgress(gates: SyncGate[]): { completed: number; total: number } {
  return {
    completed: gates.filter((gate) => gate.stabilized).length,
    total: gates.length
  };
}

export function canStabilizeSyncGate(
  gate: SyncGate,
  gateIndex: number,
  playerBounds: { x: number; y: number; w: number; h: number },
  currentSpeed: number,
  dashBoost: number,
  elapsedSeconds: number
): { canStabilize: boolean; reason?: string } {
  if (gate.stabilized) {
    return { canStabilize: false };
  }

  const gateBounds = {
    x: gate.x - gate.w * 0.5,
    y: gate.y - gate.h * 0.5,
    w: gate.w,
    h: gate.h
  };
  if (!intersects(playerBounds, gateBounds)) {
    return { canStabilize: false };
  }

  if (!syncGateReady(currentSpeed, dashBoost)) {
    return {
      canStabilize: false,
      reason: 'Need more speed or boost for the gate'
    };
  }

  if (!isPhaseWindowOpen(elapsedSeconds, gateIndex)) {
    return {
      canStabilize: false,
      reason: 'Hold speed and wait for the bright phase'
    };
  }

  return { canStabilize: true };
}
