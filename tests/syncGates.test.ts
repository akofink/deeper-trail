import { describe, expect, it } from 'vitest';
import { canStabilizeSyncGate, syncGateReady, totalSyncGateProgress, usesSyncGates } from '../src/game/runtime/syncGates';
import type { SyncGate } from '../src/game/state/runObjectives';

function makeGate(): SyncGate {
  return {
    id: 'sg0',
    x: 700,
    y: 300,
    w: 60,
    h: 90,
    stabilized: false
  };
}

describe('sync gate runtime rules', () => {
  it('only enables sync gates in anomaly runs', () => {
    expect(usesSyncGates('anomaly')).toBe(true);
    expect(usesSyncGates('town')).toBe(false);
  });

  it('requires speed or boost plus an open phase window while crossing the gate', () => {
    const gate = makeGate();
    const bounds = { x: 680, y: 270, w: 40, h: 44 };

    expect(syncGateReady(220, 0)).toBe(true);
    expect(syncGateReady(120, 0.2)).toBe(true);
    expect(syncGateReady(120, 0.05)).toBe(false);

    const slow = canStabilizeSyncGate(gate, 0, bounds, 120, 0.05, 0.1);
    expect(slow.canStabilize).toBe(false);
    expect(slow.reason).toContain('speed or boost');

    const closedWindow = canStabilizeSyncGate(gate, 0, bounds, 240, 0.2, 0.9);
    expect(closedWindow.canStabilize).toBe(false);
    expect(closedWindow.reason).toContain('out of phase');

    const openWindow = canStabilizeSyncGate(gate, 0, bounds, 240, 0.2, 0.1);
    expect(openWindow.canStabilize).toBe(true);
  });

  it('ignores gates when the player is outside their bounds', () => {
    const gate = makeGate();
    const bounds = { x: 100, y: 100, w: 40, h: 44 };

    expect(canStabilizeSyncGate(gate, 0, bounds, 240, 0.2, 0.1)).toEqual({ canStabilize: false });
  });

  it('reports aggregate completion counts', () => {
    const gates = [
      { ...makeGate(), stabilized: true },
      makeGate()
    ];

    expect(totalSyncGateProgress(gates)).toEqual({ completed: 1, total: 2 });
  });
});
