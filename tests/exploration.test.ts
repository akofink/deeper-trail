import { describe, expect, it } from 'vitest';
import { biomeBenefitLabel, biomeRiskLabel, markNodeVisited, noteBiomeArrival, noteBiomeHazard } from '../src/engine/sim/exploration';
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
});
