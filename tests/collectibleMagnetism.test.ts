import { describe, expect, it } from 'vitest';
import { pullCollectibleTowardTarget } from '../src/game/runtime/collectibleMagnetism';
import type { Collectible } from '../src/game/runtime/runtimeState';

function makeCollectible(): Collectible {
  return { x: 20, y: 0, r: 8, collected: false };
}

describe('pullCollectibleTowardTarget', () => {
  it('pulls collectibles toward the player while they are inside the magnet radius', () => {
    const collectible = makeCollectible();

    pullCollectibleTowardTarget(collectible, 0, 0, 0.1, 30, 50);

    expect(collectible.x).toBeLessThan(20);
    expect(collectible.y).toBe(0);
  });

  it('does not move collectibles outside the magnet radius', () => {
    const collectible = makeCollectible();

    pullCollectibleTowardTarget(collectible, 0, 0, 0.1, 10, 50);

    expect(collectible.x).toBe(20);
    expect(collectible.y).toBe(0);
  });

  it('never overshoots the player target', () => {
    const collectible = { x: 4, y: 3, r: 8, collected: false };

    pullCollectibleTowardTarget(collectible, 0, 0, 1, 20, 50);

    expect(collectible.x).toBeCloseTo(0);
    expect(collectible.y).toBeCloseTo(0);
  });
});
