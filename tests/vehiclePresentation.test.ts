import { describe, expect, it } from 'vitest';
import { advanceWheelRotation } from '../src/game/runtime/vehiclePresentation';

describe('advanceWheelRotation', () => {
  it('keeps wheel rotation steady when the vehicle is not moving', () => {
    expect(advanceWheelRotation(1.25, 0, 1 / 60, 8)).toBeCloseTo(1.25);
  });

  it('rotates wheels in proportion to horizontal velocity', () => {
    const slowRotation = advanceWheelRotation(0, 120, 1 / 60, 8);
    const fastRotation = advanceWheelRotation(0, 240, 1 / 60, 8);

    expect(slowRotation).toBeGreaterThan(0);
    expect(fastRotation).toBeCloseTo(slowRotation * 2);
  });
});
