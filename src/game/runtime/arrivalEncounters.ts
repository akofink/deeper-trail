import { getMaxHealth } from '../../engine/sim/vehicle';
import type { NodeTypeKey } from '../state/gameState';
import type { RuntimeState } from './runtimeState';

export interface ArrivalEncounterOutcome {
  readonly id: string | null;
  readonly message: string;
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
