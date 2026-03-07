import { describe, expect, it } from 'vitest';
import {
  canShatterImpactPlate,
  impactPlatePrompt,
  isWithinImpactPlate,
  totalImpactPlateProgress,
  usesImpactPlates
} from '../src/game/runtime/impactPlates';
import type { ImpactPlate } from '../src/game/state/runObjectives';

function makePlate(): ImpactPlate {
  return {
    id: 'ip0',
    x: 620,
    w: 110,
    shattered: false
  };
}

describe('impact plate runtime rules', () => {
  it('only enables impact plates for ruin runs', () => {
    expect(usesImpactPlates('ruin')).toBe(true);
    expect(usesImpactPlates('nature')).toBe(false);
  });

  it('only shatters a plate on a hard landing inside the slab bounds', () => {
    const plate = makePlate();

    expect(canShatterImpactPlate(plate, 620, 260, true)).toBe(true);
    expect(canShatterImpactPlate(plate, 620, 180, true)).toBe(false);
    expect(canShatterImpactPlate(plate, 800, 260, true)).toBe(false);
    expect(canShatterImpactPlate(plate, 620, 260, false)).toBe(false);
  });

  it('reports prompts based on whether the player is grounded over the slab', () => {
    const plate = makePlate();

    expect(isWithinImpactPlate(plate, 620)).toBe(true);
    expect(isWithinImpactPlate(plate, 800)).toBe(false);
    expect(impactPlatePrompt(plate, 620, true)).toContain('land hard');
    expect(impactPlatePrompt(plate, 620, false)).toContain('Drop onto');
    expect(impactPlatePrompt(plate, 800, true)).toBeNull();
  });

  it('reports aggregate completion counts', () => {
    const plates = [{ ...makePlate(), shattered: true }, makePlate()];

    expect(totalImpactPlateProgress(plates)).toEqual({ completed: 1, total: 2 });
  });
});
