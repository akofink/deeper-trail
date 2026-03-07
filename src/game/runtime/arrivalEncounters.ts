import { revealBiomeIntel } from '../../engine/sim/exploration';
import { connectedNeighbors, findNode } from '../../engine/sim/world';
import { getMaxHealth } from '../../engine/sim/vehicle';
import type { NodeTypeKey } from '../state/gameState';
import type { RuntimeState } from './runtimeState';

export interface ArrivalEncounterOutcome {
  readonly id: string | null;
  readonly message: string;
}

function revealConnectedBiomeIntel(state: RuntimeState): string[] {
  const revealedTypes = new Set<string>();

  for (const neighbor of connectedNeighbors(state.sim)) {
    const node = findNode(state.sim, neighbor.nodeId);
    if (!node) {
      continue;
    }

    revealBiomeIntel(state.sim, node.type);
    revealedTypes.add(node.type);
  }

  return Array.from(revealedTypes).sort();
}

export function resolveArrivalEncounter(
  state: RuntimeState,
  nodeType: NodeTypeKey,
  firstVisit: boolean
): ArrivalEncounterOutcome {
  if (!firstVisit) {
    return {
      id: null,
      message: ''
    };
  }

  if (nodeType === 'ruin' && state.sim.vehicle.scanner >= 2) {
    state.sim.scrap += 1;
    return {
      id: 'ruin-alignment-cache',
      message: ' Scanner traced a buried relay seam: alignment cache +1 scrap.'
    };
  }

  if (nodeType === 'town' && state.sim.notebook.synthesisUnlocked) {
    state.freeTravelCharges += 1;
    const revealedTypes = revealConnectedBiomeIntel(state);
    const routeLabel = revealedTypes.length > 0 ? ` charted ${revealedTypes.join('/')} routes and` : '';
    return {
      id: 'town-surveyor-synthesis',
      message: ` Surveyor broker synced your synthesis notes:${routeLabel} banked +1 free transfer.`
    };
  }

  if (nodeType === 'town' && state.sim.notebook.entries.length > 0) {
    state.freeTravelCharges += 1;
    return {
      id: 'town-surveyor-broker',
      message: ' Surveyor broker cross-checked the notebook and charted +1 free transfer.'
    };
  }

  if (
    nodeType === 'nature' &&
    state.sim.notebook.discoveredClues.nature &&
    state.health < getMaxHealth(state.sim.vehicle)
  ) {
    state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + 1);
    return {
      id: 'nature-shelter-trace',
      message: ' Shelter markers matched earlier field notes: recovered +1 additional health.'
    };
  }

  if (nodeType === 'anomaly' && state.sim.notebook.synthesisUnlocked && state.sim.vehicle.shielding >= 2) {
    state.freeTravelCharges += 1;
    return {
      id: 'anomaly-phase-corridor',
      message: ' Phase corridor locked to your synthesis notes: +1 free transfer banked.'
    };
  }

  return {
    id: null,
    message: ''
  };
}
