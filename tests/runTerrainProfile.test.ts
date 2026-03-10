import { describe, expect, it } from 'vitest';
import { encounterRiseAt, encounterRiseProfile } from '../src/game/runtime/runTerrainProfile';

describe('runTerrainProfile', () => {
  it('returns deterministic per-biome rise profiles', () => {
    expect(encounterRiseProfile('town')).toEqual([6, 20, 34, 16, 30, 12]);
    expect(encounterRiseProfile('nature')).toEqual([14, 38, 24, 52, 34, 58]);
    expect(encounterRiseProfile('anomaly')).toEqual([18, 44, 28, 60, 38, 66]);
  });

  it('wraps encounter rise indexes for repeated terrain shelves', () => {
    expect(encounterRiseAt('ruin', 1)).toBe(28);
    expect(encounterRiseAt('ruin', 7)).toBe(28);
    expect(encounterRiseAt('ruin', -5)).toBe(28);
  });
});
