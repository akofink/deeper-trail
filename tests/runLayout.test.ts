import { describe, expect, it } from 'vitest';
import { buildRunLayout } from '../src/game/runtime/runLayout';

describe('runLayout', () => {
  it('raises collectibles and beacons through a deterministic vertical profile', () => {
    const layout = buildRunLayout(500, 'nature');

    expect(layout.collectibles.map((item) => item.y)).toEqual([422, 390, 408, 368, 392, 366]);
    expect(layout.beacons.map((beacon) => beacon.y)).toEqual([432, 421, 416]);
    expect(layout.canopyLifts.map((lift) => lift.y)).toEqual([343, 315]);
  });

  it('keeps anomaly gates on different elevation beats across the run', () => {
    const layout = buildRunLayout(500, 'anomaly');

    expect(layout.syncGates.map((gate) => gate.y)).toEqual([365, 353]);
    expect(new Set(layout.collectibles.map((item) => item.y)).size).toBeGreaterThan(4);
  });
});
