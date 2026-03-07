import { describe, expect, it } from 'vitest';
import { advanceHorizontalVelocity } from '../src/game/runtime/runMotion';

describe('advanceHorizontalVelocity', () => {
  it('builds pace gradually from a standstill on the ground', () => {
    let velocity = 0;

    for (let i = 0; i < 6; i += 1) {
      velocity = advanceHorizontalVelocity(velocity, 235, 1 / 60, true);
    }

    expect(velocity).toBeGreaterThan(0);
    expect(velocity).toBeLessThan(120);
  });

  it('bleeds off speed faster when input is released on the ground', () => {
    const coasting = advanceHorizontalVelocity(180, 235, 1 / 60, true);
    const braking = advanceHorizontalVelocity(180, 0, 1 / 60, true);

    expect(coasting).toBeGreaterThan(180);
    expect(braking).toBeLessThan(160);
  });

  it('turns harder in air when reversing direction', () => {
    const sameDirection = advanceHorizontalVelocity(90, 235, 1 / 60, false);
    const reversing = advanceHorizontalVelocity(90, -235, 1 / 60, false);

    expect(sameDirection).toBeGreaterThan(90);
    expect(reversing).toBeLessThan(70);
  });
});
