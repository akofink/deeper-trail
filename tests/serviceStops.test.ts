import { describe, expect, it } from 'vitest';
import { SERVICE_STOP_HOLD_SECONDS, totalServiceStopProgress, updateServiceStopProgress, usesServiceStops } from '../src/game/runtime/serviceStops';
import type { ServiceStop } from '../src/game/state/runObjectives';

function makeStop(): ServiceStop {
  return {
    id: 'svc0',
    x: 600,
    w: 120,
    progress: 0,
    serviced: false
  };
}

describe('service stop runtime rules', () => {
  it('only enables service stops for town runs', () => {
    expect(usesServiceStops('town')).toBe(true);
    expect(usesServiceStops('ruin')).toBe(false);
  });

  it('completes a service stop after holding steady in the zone long enough', () => {
    const stop = makeStop();

    const first = updateServiceStopProgress(stop, SERVICE_STOP_HOLD_SECONDS * 0.5, true, true);
    expect(first.completedNow).toBe(false);
    expect(stop.progress).toBeGreaterThan(0);

    const second = updateServiceStopProgress(stop, SERVICE_STOP_HOLD_SECONDS * 0.6, true, true);
    expect(second.completedNow).toBe(true);
    expect(stop.serviced).toBe(true);
    expect(stop.progress).toBe(SERVICE_STOP_HOLD_SECONDS);
  });

  it('bleeds progress back off when the player leaves or destabilizes early', () => {
    const stop = makeStop();

    updateServiceStopProgress(stop, SERVICE_STOP_HOLD_SECONDS * 0.5, true, true);
    const heldProgress = stop.progress;

    updateServiceStopProgress(stop, 0.2, false, false);
    expect(stop.progress).toBeLessThan(heldProgress);
    expect(stop.serviced).toBe(false);
  });

  it('reports aggregate completion counts', () => {
    const stops = [
      { ...makeStop(), serviced: true, progress: SERVICE_STOP_HOLD_SECONDS },
      makeStop()
    ];

    expect(totalServiceStopProgress(stops)).toEqual({ completed: 1, total: 2 });
  });

  it('supports shorter hold targets for upgraded engines', () => {
    const stop = makeStop();

    const first = updateServiceStopProgress(stop, 0.25, true, true, 0.46);
    expect(first.completedNow).toBe(false);

    const second = updateServiceStopProgress(stop, 0.22, true, true, 0.46);
    expect(second.completedNow).toBe(true);
    expect(stop.progress).toBeCloseTo(0.46);
  });
});
