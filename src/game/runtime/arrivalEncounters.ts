import { revealBiomeIntel } from '../../engine/sim/exploration';
import { connectedNeighbors, findNode } from '../../engine/sim/world';
import { getDamageSubsystemForNodeType, getMaxHealth, MAX_SUBSYSTEM_CONDITION, repairSubsystem } from '../../engine/sim/vehicle';
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
  firstVisit: boolean,
  options: {
    arrivedViaBestLeadRoute?: boolean;
  } = {}
): ArrivalEncounterOutcome {
  if (!firstVisit) {
    return {
      id: null,
      message: ''
    };
  }

  const encounterIds: string[] = [];
  const messages: string[] = [];

  if (options.arrivedViaBestLeadRoute && state.sim.notebook.synthesisUnlocked) {
    const subsystem = getDamageSubsystemForNodeType(nodeType);
    if (state.sim.vehicleCondition[subsystem] < MAX_SUBSYSTEM_CONDITION) {
      repairSubsystem(state.sim, subsystem, 1);
      encounterIds.push('signal-route-tune-up');
      messages.push(` Signal line held on approach: ${subsystem} condition +1.`);
    } else {
      state.sim.scrap += 1;
      encounterIds.push('signal-route-cache');
      messages.push(' Signal line held on approach: cached route salvage +1 scrap.');
    }
  }

  if (nodeType === 'ruin' && state.sim.vehicle.scanner >= 2) {
    state.sim.scrap += 1;
    encounterIds.push('ruin-alignment-cache');
    messages.push(' Scanner traced a buried relay seam: alignment cache +1 scrap.');
  }

  if (nodeType === 'town' && state.sim.notebook.synthesisUnlocked) {
    state.freeTravelCharges += 1;
    const revealedTypes = revealConnectedBiomeIntel(state);
    const routeLabel = revealedTypes.length > 0 ? ` charted ${revealedTypes.join('/')} routes and` : '';
    encounterIds.push('town-surveyor-synthesis');
    messages.push(` Surveyor broker synced your synthesis notes:${routeLabel} banked +1 free transfer.`);
  } else if (nodeType === 'town' && state.sim.notebook.entries.length > 0) {
    state.freeTravelCharges += 1;
    encounterIds.push('town-surveyor-broker');
    messages.push(' Surveyor broker cross-checked the notebook and charted +1 free transfer.');
  }

  if (
    nodeType === 'nature' &&
    state.sim.notebook.discoveredClues.nature &&
    state.health < getMaxHealth(state.sim.vehicle)
  ) {
    state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + 1);
    encounterIds.push('nature-shelter-trace');
    messages.push(' Shelter markers matched earlier field notes: recovered +1 additional health.');
  }

  if (nodeType === 'anomaly' && state.sim.notebook.synthesisUnlocked && state.sim.vehicle.shielding >= 2) {
    state.freeTravelCharges += 1;
    encounterIds.push('anomaly-phase-corridor');
    messages.push(' Phase corridor locked to your synthesis notes: +1 free transfer banked.');
  }

  return {
    id: encounterIds.length > 0 ? encounterIds.join('+') : null,
    message: messages.join('')
  };
}
