import { describe, expect, it } from 'vitest';
import {
  latestNotebookEntry,
  notebookClueProgress,
  notebookCoreClueSequence,
  notebookSignalRouteIntel,
  recordNotebookClue
} from '../src/engine/sim/notebook';
import { connectedNeighbors, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
import { createInitialGameState } from '../src/game/state/gameState';

function findRouteComparisonCase(state: ReturnType<typeof createInitialGameState>, goalNodeId: string) {
  for (const node of state.world.nodes) {
    const currentLegs = shortestLegCountBetweenNodes(state, node.id, goalNodeId);
    if (currentLegs === null || currentLegs === 0) {
      continue;
    }

    state.currentNodeId = node.id;
    const neighbors = connectedNeighbors(state)
      .map((neighbor) => ({
        ...neighbor,
        legs: shortestLegCountBetweenNodes(state, neighbor.nodeId, goalNodeId)
      }))
      .filter((neighbor): neighbor is { nodeId: string; distance: number; legs: number } => neighbor.legs !== null);

    const stronger = neighbors.find((neighbor) => neighbor.legs < currentLegs) ?? null;
    const weaker = neighbors.find((neighbor) => neighbor.legs > currentLegs) ?? null;
    const best = neighbors.reduce<typeof neighbors[number] | null>(
      (selected, neighbor) => (selected === null || neighbor.legs < selected.legs ? neighbor : selected),
      null
    );

    if (stronger && weaker && best) {
      return { best, currentNodeId: node.id, stronger, weaker };
    }
  }

  throw new Error('Expected a node with both stronger and weaker connected routes');
}

describe('notebook clues', () => {
  it('records one deterministic clue per core biome and avoids duplicates', () => {
    const state = createInitialGameState('notebook-seed');

    const first = recordNotebookClue(state, { nodeType: 'ruin', nodeId: 'n4' });
    const second = recordNotebookClue(state, { nodeType: 'ruin', nodeId: 'n4' });

    expect(first.newEntries).toHaveLength(1);
    expect(first.newEntries[0]?.title).toBeTruthy();
    expect(first.newEntries[0]?.body).toBeTruthy();
    expect(second.newEntries).toHaveLength(0);
    expect(state.notebook.entries).toHaveLength(1);
    expect(state.notebook.discoveredClues.ruin).toBe(true);
  });

  it('stays deterministic for the same seed and clue type', () => {
    const stateA = createInitialGameState('notebook-stable');
    const stateB = createInitialGameState('notebook-stable');

    const resultA = recordNotebookClue(stateA, { nodeType: 'nature', nodeId: 'n2' });
    const resultB = recordNotebookClue(stateB, { nodeType: 'nature', nodeId: 'n9' });

    expect(resultA.newEntries[0]?.title).toBe(resultB.newEntries[0]?.title);
    expect(resultA.newEntries[0]?.body).toBe(resultB.newEntries[0]?.body);
  });

  it('unlocks a synthesis entry once all core clues are found', () => {
    const state = createInitialGameState('notebook-arc');

    recordNotebookClue(state, { nodeType: 'ruin', nodeId: 'n1' });
    recordNotebookClue(state, { nodeType: 'nature', nodeId: 'n2' });
    const anomalyResult = recordNotebookClue(state, { nodeType: 'anomaly', nodeId: 'n3' });

    expect(anomalyResult.newEntries).toHaveLength(2);
    expect(anomalyResult.newEntries[1]?.clueKey).toBe('synthesis');
    expect(state.notebook.synthesisUnlocked).toBe(true);
    expect(notebookClueProgress(state)).toEqual({ discovered: 3, total: 3 });
    expect(notebookCoreClueSequence(state)).toEqual(['ruin', 'nature', 'anomaly']);
    expect(latestNotebookEntry(state)?.clueKey).toBe('synthesis');
  });

  it('turns notebook progress into route-triangulation intel', () => {
    const state = createInitialGameState('notebook-triangulation');
    const goalNodeId = 'n9';
    const routeCase = findRouteComparisonCase(state, goalNodeId);
    state.currentNodeId = routeCase.currentNodeId;

    const offline = notebookSignalRouteIntel(state, goalNodeId, routeCase.stronger.nodeId);
    expect(offline.fieldNote).toContain('bearing offline');
    expect(offline.routeHint).toBeNull();
    expect(offline.revealsObjective).toBe(false);
    expect(offline.isBestLead).toBe(false);
    expect(offline.bestLeadArrivalRewardHint).toBeNull();

    recordNotebookClue(state, { nodeType: 'ruin', nodeId: routeCase.currentNodeId });
    const bearingOnly = notebookSignalRouteIntel(state, goalNodeId, routeCase.stronger.nodeId);
    expect(bearingOnly.routeHint).toContain('strengthens');
    expect(bearingOnly.routeHint).not.toContain('Source est.');
    expect(bearingOnly.revealsBenefit).toBe(false);

    recordNotebookClue(state, { nodeType: 'nature', nodeId: routeCase.stronger.nodeId });
    const withDepth = notebookSignalRouteIntel(state, goalNodeId, routeCase.weaker.nodeId);
    expect(withDepth.fieldNote).toContain('depth online');
    expect(withDepth.routeHint).toContain('weakens');
    expect(withDepth.routeHint).toContain(`Source est. ${routeCase.weaker.legs} legs.`);
    expect(withDepth.revealsRisk).toBe(false);

    recordNotebookClue(state, { nodeType: 'anomaly', nodeId: routeCase.weaker.nodeId });
    const synthesized = notebookSignalRouteIntel(state, goalNodeId, routeCase.best.nodeId);
    expect(synthesized.fieldNote).toContain('synth lock');
    expect(synthesized.routeHint).toContain('Best current lead.');
    expect(synthesized.revealsBenefit).toBe(true);
    expect(synthesized.revealsObjective).toBe(true);
    expect(synthesized.revealsRisk).toBe(true);
    expect(synthesized.isBestLead).toBe(true);
    expect(synthesized.bestLeadArrivalRewardHint).toContain('Lead route tune-up');

    const nonLead = notebookSignalRouteIntel(state, goalNodeId, routeCase.weaker.nodeId);
    expect(nonLead.routeHint).not.toContain('Best current lead.');
    expect(nonLead.revealsBenefit).toBe(false);
    expect(nonLead.revealsObjective).toBe(false);
    expect(nonLead.revealsRisk).toBe(false);
    expect(nonLead.isBestLead).toBe(false);
    expect(nonLead.bestLeadArrivalRewardHint).toBeNull();
  });
});
