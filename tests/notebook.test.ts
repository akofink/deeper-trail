import { describe, expect, it } from 'vitest';
import { latestNotebookEntry, notebookClueProgress, recordNotebookClue } from '../src/engine/sim/notebook';
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
});
