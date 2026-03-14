import { describe, expect, it } from 'vitest';

import { connectedNeighbors, findNode } from '../src/engine/sim/world';
import { previewArrivalEncounter, resolveArrivalEncounter } from '../src/game/runtime/arrivalEncounters';
import { createInitialRuntimeState } from '../src/game/runtime/runtimeState';

describe('arrival encounter helpers', () => {
  it('keeps town synthesis previews side-effect free while preserving the revealed-route summary', () => {
    const state = createInitialRuntimeState(720, 'arrival-encounter-preview');
    state.scene = 'map';
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;

    const destination = connectedNeighbors(state.sim)
      .map((neighbor) => findNode(state.sim, neighbor.nodeId))
      .find((node) => node);
    if (!destination) {
      throw new Error('Expected a connected destination');
    }
    destination.type = 'town';

    const beforeKnowledge = structuredClone(state.sim.exploration.biomeKnowledge);
    const preview = previewArrivalEncounter(state, 'town', true);

    expect(preview.summary).toContain('Surveyor broker: +1 free transfer');
    expect(preview.summary).toContain('reveal');
    expect(state.sim.exploration.biomeKnowledge).toEqual(beforeKnowledge);

    const outcome = resolveArrivalEncounter(state, 'town', true);
    expect(outcome.message).toContain('banked +1 free transfer');
    expect(state.sim.exploration.biomeKnowledge).not.toEqual(beforeKnowledge);
  });
});
