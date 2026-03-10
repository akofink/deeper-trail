import { describe, expect, it } from 'vitest';
import { buildRunLayout } from '../src/game/runtime/runLayout';

describe('runLayout', () => {
  it('raises collectibles and beacons through a deterministic vertical profile', () => {
    const layout = buildRunLayout(500, 'nature');

    expect(layout.collectibles.map((item) => item.y)).toEqual([412, 374, 394, 348, 376, 346]);
    expect(layout.beacons.map((beacon) => beacon.y)).toEqual([432, 421, 416]);
    expect(layout.canopyLifts.map((lift) => lift.y)).toEqual([343, 315]);
    expect(layout.hazards.map((hazard) => hazard.kind)).toEqual(['sweeper', 'static', 'stomper', 'sweeper', 'static', 'stomper']);
  });

  it('keeps anomaly gates on different elevation beats across the run', () => {
    const layout = buildRunLayout(500, 'anomaly');

    expect(layout.syncGates.map((gate) => gate.y)).toEqual([365, 353]);
    expect(new Set(layout.collectibles.map((item) => item.y)).size).toBeGreaterThan(4);
    expect(layout.hazards.map((hazard) => [hazard.kind, hazard.amplitudeX, hazard.amplitudeY, hazard.pulse])).toEqual([
      ['pulsing', 0, 0, 14],
      ['sweeper', 40, 0, 0],
      ['stomper', 0, 36, 0],
      ['pulsing', 0, 0, 18],
      ['sweeper', 46, 0, 0],
      ['stomper', 0, 42, 0]
    ]);
  });

  it('keeps town relays inside grounded steady-link reach', () => {
    const groundY = 500;
    const layout = buildRunLayout(groundY, 'town');
    const groundedPlayerCenterY = groundY - 22;
    const maxGroundedReach = 55;

    expect(layout.beacons.map((beacon) => beacon.y)).toEqual([449, 433, 436]);
    expect(layout.beacons.every((beacon) => groundedPlayerCenterY - beacon.y <= maxGroundedReach)).toBe(true);
    expect(layout.serviceStops).toHaveLength(2);
  });
});
