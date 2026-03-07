import { describe, expect, it } from 'vitest';
import {
  applyCanopyLiftAssist,
  CANOPY_LIFT_HOLD_SECONDS,
  isInsideCanopyLift,
  totalCanopyLiftProgress,
  updateCanopyLiftProgress,
  usesCanopyLifts
} from '../src/game/runtime/canopyLifts';
import type { CanopyLift } from '../src/game/state/runObjectives';

function makeLift(): CanopyLift {
  return {
    id: 'cl0',
    x: 640,
    y: 260,
    w: 120,
    h: 100,
    progress: 0,
    charted: false
  };
}

describe('canopy lift runtime rules', () => {
  it('only enables canopy lifts for nature runs', () => {
    expect(usesCanopyLifts('nature')).toBe(true);
    expect(usesCanopyLifts('town')).toBe(false);
  });

  it('completes a lift after holding airborne inside the zone long enough', () => {
    const lift = makeLift();

    const first = updateCanopyLiftProgress(lift, CANOPY_LIFT_HOLD_SECONDS * 0.5, true, true);
    expect(first.completedNow).toBe(false);
    expect(lift.progress).toBeGreaterThan(0);

    const second = updateCanopyLiftProgress(lift, CANOPY_LIFT_HOLD_SECONDS * 0.6, true, true);
    expect(second.completedNow).toBe(true);
    expect(lift.charted).toBe(true);
    expect(lift.progress).toBe(CANOPY_LIFT_HOLD_SECONDS);
  });

  it('bleeds progress off when the player leaves or lands early', () => {
    const lift = makeLift();

    updateCanopyLiftProgress(lift, CANOPY_LIFT_HOLD_SECONDS * 0.5, true, true);
    const heldProgress = lift.progress;

    updateCanopyLiftProgress(lift, 0.2, true, false);
    expect(lift.progress).toBeLessThan(heldProgress);
    expect(lift.charted).toBe(false);
  });

  it('detects when the player intersects the lift and adds upward assist', () => {
    const lift = makeLift();

    expect(isInsideCanopyLift(lift, { x: 610, y: 230, w: 32, h: 40 })).toBe(true);
    expect(isInsideCanopyLift(lift, { x: 100, y: 100, w: 32, h: 40 })).toBe(false);

    expect(applyCanopyLiftAssist(160, 0.2)).toBeLessThan(160);
    expect(applyCanopyLiftAssist(-190, 0.2)).toBe(-180);
  });

  it('reports aggregate completion counts', () => {
    const lifts = [
      { ...makeLift(), charted: true, progress: CANOPY_LIFT_HOLD_SECONDS },
      makeLift()
    ];

    expect(totalCanopyLiftProgress(lifts)).toEqual({ completed: 1, total: 2 });
  });
});
