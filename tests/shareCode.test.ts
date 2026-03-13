import { describe, expect, it } from 'vitest';
import { buildSeedBuildShareCode } from '../src/engine/sim/shareCode';
import { createInitialGameState } from '../src/game/state/gameState';

describe('buildSeedBuildShareCode', () => {
  it('encodes seed, subsystem levels, and subsystem condition in a stable order', () => {
    const sim = createInitialGameState('seed-42');
    sim.vehicle.frame = 2;
    sim.vehicle.engine = 3;
    sim.vehicle.scanner = 4;
    sim.vehicle.suspension = 1;
    sim.vehicle.storage = 2;
    sim.vehicle.shielding = 3;
    sim.vehicleCondition.frame = 3;
    sim.vehicleCondition.engine = 2;
    sim.vehicleCondition.scanner = 1;
    sim.vehicleCondition.suspension = 0;
    sim.vehicleCondition.storage = 1;
    sim.vehicleCondition.shielding = 2;

    expect(buildSeedBuildShareCode(sim)).toBe('DT1-SEED42-234123-321012');
  });

  it('normalizes share seed content and falls back when no alphanumeric characters remain', () => {
    const punctuationOnly = createInitialGameState('---');
    const mixedSeed = createInitialGameState('my cool/seed@2026!');

    expect(buildSeedBuildShareCode(punctuationOnly)).toBe('DT1-SEEDLESS-111111-333333');
    expect(buildSeedBuildShareCode(mixedSeed)).toBe('DT1-MYCOOLSEED20-111111-333333');
  });
});
