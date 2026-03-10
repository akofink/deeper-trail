import { describe, expect, it } from 'vitest';
import { connectedNeighbors, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
import {
  latestNotebookEntry,
  notebookClueProgress,
  notebookCoreClueSequence,
  notebookSignalRouteIntel,
  recordNotebookClue
} from '../src/engine/sim/notebook';
import { createInitialGameState } from '../src/game/state/gameState';

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
    const currentNode = state.world.nodes.find((node) => {
      const degree = state.world.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
      return degree >= 2;
    });
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected a hub node');
    }
    state.currentNodeId = currentNode.id;
    const neighbors = connectedNeighbors(state);
    expect(neighbors.length).toBeGreaterThanOrEqual(2);
    const expeditionGoalNodeId = state.world.nodes.at(-1)?.id ?? state.currentNodeId;
    const neighborWithLegs = neighbors
      .map((neighbor) => ({
        nodeId: neighbor.nodeId,
        legs: shortestLegCountBetweenNodes(state, neighbor.nodeId, expeditionGoalNodeId)
      }))
      .filter((entry): entry is { nodeId: string; legs: number } => entry.legs !== null)
      .sort((a, b) => a.legs - b.legs);
    const strongestLead = neighborWithLegs[0];
    const weakerLead = neighborWithLegs.at(-1);
    expect(strongestLead).toBeDefined();
    expect(weakerLead).toBeDefined();
    if (!strongestLead || !weakerLead) {
      throw new Error('Expected route options with leg counts');
    }

    const offline = notebookSignalRouteIntel(state, expeditionGoalNodeId, strongestLead.nodeId);
    expect(offline.fieldNote).toContain('bearing offline');
    expect(offline.routeHint).toBeNull();
    expect(offline.revealsObjective).toBe(false);

    recordNotebookClue(state, { nodeType: 'ruin', nodeId: state.currentNodeId });
    const bearingOnly = notebookSignalRouteIntel(state, expeditionGoalNodeId, strongestLead.nodeId);
    expect(bearingOnly.routeHint).toContain('strengthens');
    expect(bearingOnly.routeHint).not.toContain('Source est.');
    expect(bearingOnly.revealsBenefit).toBe(false);

    recordNotebookClue(state, { nodeType: 'nature', nodeId: strongestLead.nodeId });
    const withDepth = notebookSignalRouteIntel(state, expeditionGoalNodeId, weakerLead.nodeId);
    expect(withDepth.fieldNote).toContain('depth online');
    expect(withDepth.routeHint).toContain('weakens');
    expect(withDepth.routeHint).toContain(`Source est. ${weakerLead.legs} leg${weakerLead.legs === 1 ? '' : 's'}.`);
    expect(withDepth.revealsRisk).toBe(false);

    recordNotebookClue(state, { nodeType: 'anomaly', nodeId: weakerLead.nodeId });
    const synthesized = notebookSignalRouteIntel(state, expeditionGoalNodeId, strongestLead.nodeId);
    expect(synthesized.fieldNote).toContain('synth lock');
    expect(synthesized.routeHint).toContain('Best current lead.');
    expect(synthesized.revealsBenefit).toBe(true);
    expect(synthesized.revealsObjective).toBe(true);
    expect(synthesized.revealsRisk).toBe(true);

    const nonLead = notebookSignalRouteIntel(state, expeditionGoalNodeId, weakerLead.nodeId);
    expect(nonLead.routeHint).not.toContain('Best current lead.');
    expect(nonLead.revealsBenefit).toBe(false);
    expect(nonLead.revealsObjective).toBe(false);
    expect(nonLead.revealsRisk).toBe(false);
  });
});
