import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../src/engine/rng/seededRng';

describe('createSeededRng', () => {
  it('returns deterministic output for same seed', () => {
    const rngA = createSeededRng('same-seed');
    const rngB = createSeededRng('same-seed');

    const valuesA = [rngA.next(), rngA.next(), rngA.next()];
    const valuesB = [rngB.next(), rngB.next(), rngB.next()];

    expect(valuesA).toEqual(valuesB);
  });

  it('throws for invalid nextInt max', () => {
    const rng = createSeededRng('seed');

    expect(() => rng.nextInt(0)).toThrow('maxExclusive must be a positive integer');
  });

  it('keeps next() values within [0, 1)', () => {
    const rng = createSeededRng('range-seed');

    for (let i = 0; i < 5000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
