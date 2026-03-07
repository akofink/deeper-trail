import { describe, expect, it } from 'vitest';
import { latestNotebookEntry, notebookClueProgress, notebookSignalRouteIntel, recordNotebookClue } from '../src/engine/sim/notebook';
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
    expect(latestNotebookEntry(state)?.clueKey).toBe('synthesis');
  });

  it('turns notebook progress into route-triangulation intel', () => {
    const state = createInitialGameState('notebook-triangulation');
    state.currentNodeId = 'n4';

    const offline = notebookSignalRouteIntel(state, 'n9', 'n5');
    expect(offline.fieldNote).toContain('bearing offline');
    expect(offline.routeHint).toBeNull();

    recordNotebookClue(state, { nodeType: 'ruin', nodeId: 'n4' });
    const bearingOnly = notebookSignalRouteIntel(state, 'n9', 'n5');
    expect(bearingOnly.routeHint).toContain('strengthens');
    expect(bearingOnly.routeHint).not.toContain('Source est.');

    recordNotebookClue(state, { nodeType: 'nature', nodeId: 'n5' });
    const withDepth = notebookSignalRouteIntel(state, 'n9', 'n3');
    expect(withDepth.fieldNote).toContain('depth online');
    expect(withDepth.routeHint).toContain('weakens');
    expect(withDepth.routeHint).toContain('Source est. 6 legs.');

    recordNotebookClue(state, { nodeType: 'anomaly', nodeId: 'n6' });
    const synthesized = notebookSignalRouteIntel(state, 'n9', 'n5');
    expect(synthesized.fieldNote).toContain('synth lock');
    expect(synthesized.routeHint).toContain('Best current lead.');
  });
});
