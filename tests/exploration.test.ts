import { describe, expect, it } from 'vitest';
import { biomeBenefitLabel, biomeRiskLabel, markNodeVisited, noteBiomeArrival, noteBiomeHazard, visibleBiomeKnowledge } from '../src/engine/sim/exploration';
import { createInitialGameState } from '../src/game/state/gameState';

describe('exploration notes', () => {
  it('records biome benefit intel on arrival and deduplicates visited nodes', () => {
    const state = createInitialGameState('exploration-arrival');

    markNodeVisited(state, 'node-2');
    markNodeVisited(state, 'node-2');
    noteBiomeArrival(state, 'nature');

    expect(state.exploration.visitedNodeIds).toContain('node-2');
    expect(state.exploration.visitedNodeIds.filter((id) => id === 'node-2')).toHaveLength(1);
    expect(state.exploration.biomeKnowledge.nature.visits).toBe(1);
    expect(state.exploration.biomeKnowledge.nature.benefitKnown).toBe(true);
    expect(biomeBenefitLabel('nature')).toContain('+1 HP');
  });

  it('records biome risk intel after taking hazard damage', () => {
    const state = createInitialGameState('exploration-hazard');

    noteBiomeHazard(state, 'anomaly');

    expect(state.exploration.biomeKnowledge.anomaly.riskKnown).toBe(true);
    expect(biomeRiskLabel('anomaly')).toContain('shielding');
  });

  it('lets scanner progression preview route intel before first visit', () => {
    const state = createInitialGameState('exploration-preview');

    expect(visibleBiomeKnowledge(state, 'ruin')).toEqual({
      benefitKnown: false,
      objectiveKnown: false,
      riskKnown: false
    });

    state.vehicle.scanner = 2;
    expect(visibleBiomeKnowledge(state, 'ruin')).toEqual({
      benefitKnown: true,
      objectiveKnown: false,
      riskKnown: false
    });

    state.vehicle.scanner = 3;
    expect(visibleBiomeKnowledge(state, 'ruin')).toEqual({
      benefitKnown: true,
      objectiveKnown: true,
      riskKnown: false
    });

    state.vehicle.scanner = 4;
    expect(visibleBiomeKnowledge(state, 'ruin')).toEqual({
      benefitKnown: true,
      objectiveKnown: true,
      riskKnown: true
    });
  });

  it('reveals biome objective intel after the first visit even without scanner upgrades', () => {
    const state = createInitialGameState('exploration-objective-memory');

    noteBiomeArrival(state, 'nature');

    expect(visibleBiomeKnowledge(state, 'nature')).toEqual({
      benefitKnown: true,
      objectiveKnown: true,
      riskKnown: false
    });
  });
});
