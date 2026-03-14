import { revealBiomeIntel } from '../../engine/sim/exploration';
import { connectedNeighbors, findNode } from '../../engine/sim/world';
import { getDamageSubsystemForNodeType, getMaxHealth, MAX_SUBSYSTEM_CONDITION, repairSubsystem } from '../../engine/sim/vehicle';
import type { NodeTypeKey } from '../state/gameState';
import type { RuntimeState } from './runtimeState';

export interface ArrivalEncounterOutcome {
  readonly id: string | null;
  readonly message: string;
}

export interface ArrivalEncounterPreview {
  readonly id: string | null;
  readonly summary: string | null;
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

function buildArrivalEncounterMessages(
  state: RuntimeState,
  nodeType: NodeTypeKey,
  options: {
    arrivedViaBestLeadRoute?: boolean;
    previewOnly?: boolean;
  } = {}
): ArrivalEncounterOutcome {
  const encounterIds: string[] = [];
  const messages: string[] = [];

  if (options.arrivedViaBestLeadRoute && state.sim.notebook.synthesisUnlocked) {
    const subsystem = getDamageSubsystemForNodeType(nodeType);
    if (state.sim.vehicleCondition[subsystem] < MAX_SUBSYSTEM_CONDITION) {
      if (!options.previewOnly) {
        repairSubsystem(state.sim, subsystem, 1);
      }
      encounterIds.push('signal-route-tune-up');
      messages.push(
        options.previewOnly
          ? `Signal line holds on approach: +1 ${subsystem} condition.`
          : `Signal line held on approach: ${subsystem} condition +1.`
      );
    } else {
      if (!options.previewOnly) {
        state.sim.scrap += 1;
      }
      encounterIds.push('signal-route-cache');
      messages.push(
        options.previewOnly ? 'Signal line holds on approach: +1 scrap cache.' : 'Signal line held on approach: cached route salvage +1 scrap.'
      );
    }
  }

  if (nodeType === 'ruin' && state.sim.notebook.discoveredClues.ruin) {
    const subsystem = getDamageSubsystemForNodeType(nodeType);
    if (state.sim.vehicleCondition[subsystem] < MAX_SUBSYSTEM_CONDITION) {
      if (!options.previewOnly) {
        repairSubsystem(state.sim, subsystem, 1);
      }
      encounterIds.push('ruin-masonry-brace');
      messages.push(
        options.previewOnly
          ? `Masonry brace trace: +1 ${subsystem} condition on first ruin arrival.`
          : `Masonry brace trace matched the notebook: ${subsystem} condition +1.`
      );
    } else {
      if (!options.previewOnly) {
        state.sim.scrap += 1;
      }
      encounterIds.push('ruin-masonry-cache');
      messages.push(
        options.previewOnly
          ? 'Masonry brace trace: +1 scrap cache on first ruin arrival.'
          : 'Masonry brace trace matched the notebook: salvage cache +1 scrap.'
      );
    }
  }

  if (nodeType === 'ruin' && state.sim.vehicle.scanner >= 2) {
    if (!options.previewOnly) {
      state.sim.scrap += 1;
    }
    encounterIds.push('ruin-alignment-cache');
    messages.push(
      options.previewOnly ? 'Scanner seam cache: +1 scrap on first ruin arrival.' : 'Scanner traced a buried relay seam: alignment cache +1 scrap.'
    );
  }

  if (nodeType === 'town' && state.sim.notebook.synthesisUnlocked) {
    if (!options.previewOnly) {
      state.freeTravelCharges += 1;
    }
    const revealedTypes = revealConnectedBiomeIntel(state);
    const previewRouteLabel = revealedTypes.length > 0 ? ` and reveal ${revealedTypes.join('/')} route intel` : '';
    const resolvedRouteLabel = revealedTypes.length > 0 ? ` charted ${revealedTypes.join('/')} routes and` : '';
    encounterIds.push('town-surveyor-synthesis');
    messages.push(
      options.previewOnly
        ? `Surveyor broker: +1 free transfer${previewRouteLabel}.`
        : `Surveyor broker synced your synthesis notes:${resolvedRouteLabel} banked +1 free transfer.`
    );
  } else if (nodeType === 'town' && state.sim.notebook.entries.length > 0) {
    if (!options.previewOnly) {
      state.freeTravelCharges += 1;
    }
    encounterIds.push('town-surveyor-broker');
    messages.push(
      options.previewOnly ? 'Surveyor broker: +1 free transfer.' : 'Surveyor broker cross-checked the notebook and charted +1 free transfer.'
    );
  }

  if (
    nodeType === 'nature' &&
    state.sim.notebook.discoveredClues.nature &&
    state.health < getMaxHealth(state.sim.vehicle)
  ) {
    if (!options.previewOnly) {
      state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + 1);
    }
    encounterIds.push('nature-shelter-trace');
    messages.push(
      options.previewOnly ? 'Shelter trace: +1 extra health.' : 'Shelter markers matched earlier field notes: recovered +1 additional health.'
    );
  }

  if (nodeType === 'anomaly' && state.sim.notebook.discoveredClues.anomaly) {
    const recoveredFuel = Math.min(2, state.sim.fuelCapacity - state.sim.fuel);
    if (!options.previewOnly) {
      state.sim.fuel += recoveredFuel;
    }
    encounterIds.push('anomaly-carrier-pocket');
    messages.push(
      options.previewOnly
        ? recoveredFuel > 0
          ? `Carrier pocket: restore +${recoveredFuel} fuel on first anomaly arrival.`
          : 'Carrier pocket: fuel cells already topped off.'
        : recoveredFuel > 0
          ? `Carrier pocket condensed out of the phase line: restored +${recoveredFuel} fuel.`
          : 'Carrier pocket condensed out of the phase line, but the fuel cells were already topped off.'
    );
  }

  if (nodeType === 'anomaly' && state.sim.notebook.synthesisUnlocked && state.sim.vehicle.shielding >= 2) {
    if (!options.previewOnly) {
      state.freeTravelCharges += 1;
    }
    encounterIds.push('anomaly-phase-corridor');
    messages.push(
      options.previewOnly ? 'Phase corridor: +1 free transfer.' : 'Phase corridor locked to your synthesis notes: +1 free transfer banked.'
    );
  }

  return {
    id: encounterIds.length > 0 ? encounterIds.join('+') : null,
    message: messages.join(' ')
  };
}

export function previewArrivalEncounter(
  state: RuntimeState,
  nodeType: NodeTypeKey,
  firstVisit: boolean,
  options: {
    arrivedViaBestLeadRoute?: boolean;
  } = {}
): ArrivalEncounterPreview {
  if (!firstVisit) {
    return {
      id: null,
      summary: null
    };
  }

  const outcome = buildArrivalEncounterMessages(state, nodeType, { ...options, previewOnly: true });
  return {
    id: outcome.id,
    summary: outcome.message || null
  };
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

  const outcome = buildArrivalEncounterMessages(state, nodeType, options);

  return {
    id: outcome.id,
    message: outcome.message ? ` ${outcome.message}` : ''
  };
}
