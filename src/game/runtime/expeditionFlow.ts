import { asNodeTypeKey, markNodeVisited, noteBiomeArrival } from '../../engine/sim/exploration';
import { notebookSignalRouteIntel, recordNotebookClue, type NotebookUnlockResult } from '../../engine/sim/notebook';
import { travelToNode, type TravelResult } from '../../engine/sim/travel';
import { currentNodeType, findNode } from '../../engine/sim/world';
import { getMaxHealth } from '../../engine/sim/vehicle';
import { resolveArrivalEncounter } from './arrivalEncounters';
import { applyLegacyCarryOver, goalSignalProfile } from './goalSignal';
import type { RuntimeState } from './runtimeState';
import { applyNodeCompletionState } from './runCompletion';
import { rechargeShieldCharge } from './shieldCharge';
import { normalizeRuntimeStateAfterVehicleChange } from './vehicleDerivedStats';

export interface NodeCompletionOutcome {
  readonly notebookUpdate: NotebookUnlockResult;
  readonly flawlessRecovery: number;
  readonly expeditionCompleted: boolean;
}

export interface RuntimeTravelResult extends TravelResult {
  readonly usedFreeTravel: boolean;
  readonly arrivalNodeType?: string;
}

export function hasCompletedCurrentNode(state: RuntimeState): boolean {
  return state.completedNodeIds.includes(state.sim.currentNodeId);
}

export function applyArrivalRewards(
  state: RuntimeState,
  options: {
    arrivedViaBestLeadRoute?: boolean;
  } = {}
): string {
  const node = findNode(state.sim, state.sim.currentNodeId);
  if (!node) {
    return '';
  }

  const firstVisit = !state.sim.exploration.visitedNodeIds.includes(node.id);
  markNodeVisited(state.sim, node.id);
  noteBiomeArrival(state.sim, node.type);

  let message = '';
  if (node.type === 'town') {
    state.sim.fuel = Math.min(state.sim.fuelCapacity, state.sim.fuel + 8);
    message = 'Arrived at town: fuel topped up +8.';
  } else if (node.type === 'ruin') {
    state.sim.scrap += 2;
    message = 'Arrived at ruins: scavenged +2 scrap.';
  } else if (node.type === 'nature') {
    state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + 1);
    message = 'Arrived in nature: stabilized +1 health.';
  } else {
    state.sim.vehicle.scanner += 1;
    message = 'Anomaly pulse: scanner subsystem +1.';
  }

  normalizeRuntimeStateAfterVehicleChange(state);
  if (node.type === 'anomaly') {
    rechargeShieldCharge(state);
    if (state.shieldChargeAvailable) {
      message += ' Shield charge restored.';
    }
  }

  const goalSignal = goalSignalProfile(state);
  if (goalSignal) {
    if (goalSignal.arrivalBonusType === 'scrap') {
      state.sim.scrap += 2;
    } else if (goalSignal.arrivalBonusType === 'health') {
      state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + 1);
    } else {
      state.sim.fuel = Math.min(state.sim.fuelCapacity, state.sim.fuel + 4);
    }
    message += ` Goal decode: ${goalSignal.arrivalBonusNote}. Source read: ${goalSignal.encounterBonusNote}.`;
  }

  message += resolveArrivalEncounter(state, asNodeTypeKey(node.type), firstVisit, options).message;

  state.mapMessage = message;
  state.mapMessageTimer = 3;
  return message;
}

export function completeCurrentNodeRun(state: RuntimeState): NodeCompletionOutcome {
  const completedNodeType = asNodeTypeKey(currentNodeType(state.sim));
  state.mode = 'won';
  if (!hasCompletedCurrentNode(state)) {
    state.completedNodeIds.push(state.sim.currentNodeId);
  }

  const notebookUpdate = recordNotebookClue(state.sim, {
    nodeType: completedNodeType,
    nodeId: state.sim.currentNodeId
  });

  state.freeTravelCharges += 1;
  const flawlessRecovery = state.tookDamageThisRun ? 0 : 1;
  if (flawlessRecovery > 0) {
    state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + flawlessRecovery);
  }

  const expeditionCompleted = state.sim.currentNodeId === state.expeditionGoalNodeId;
  if (expeditionCompleted) {
    state.expeditionComplete = true;
    const goalSignal = goalSignalProfile(state);
    if (goalSignal) {
      state.postGoalRouteHookType = goalSignal.postGoalRouteHookType;
      state.postGoalRouteHookCharges = 2;
      state.postGoalRouteHookNote = goalSignal.postGoalRouteHookNote;
    } else {
      state.postGoalRouteHookType = null;
      state.postGoalRouteHookCharges = 0;
      state.postGoalRouteHookNote = '';
    }
  }

  applyNodeCompletionState(state);
  if (!expeditionCompleted) {
    state.mapMessage = 'Route board unlocked. Pick a connected route and press Enter to travel.';
  }
  state.mapMessageTimer = 4;
  state.sim.day += 1;
  state.sim.fuel = Math.min(state.sim.fuelCapacity, state.sim.fuel + 3);

  return {
    notebookUpdate,
    flawlessRecovery,
    expeditionCompleted
  };
}

export function travelToNodeWithRuntimeEffects(state: RuntimeState, destinationNodeId: string): RuntimeTravelResult {
  const signalIntel = notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, destinationNodeId);
  const fuelBefore = state.sim.fuel;
  const freeTravelChargesBefore = state.freeTravelCharges;
  const useFreeTravelCharge = state.freeTravelCharges > 0;
  const result = travelToNode(state.sim, destinationNodeId, {
    ignoreFuelRequirement: useFreeTravelCharge
  });
  if (!result.didTravel) {
    state.lastTravel = null;
    return {
      ...result,
      usedFreeTravel: false
    };
  }

  let usedFreeTravel = false;
  if (state.freeTravelCharges > 0 && result.fuelCost) {
    state.sim.fuel += result.fuelCost;
    state.freeTravelCharges -= 1;
    usedFreeTravel = true;
  }

  const fuelAfterTravel = state.sim.fuel;
  const freeTravelChargesAfter = state.freeTravelCharges;
  const arrivalNodeType = currentNodeType(state.sim);
  applyArrivalRewards(state, { arrivedViaBestLeadRoute: signalIntel.isBestLead });
  const legacyCarryOverMessage = applyLegacyCarryOver(state);
  if (legacyCarryOverMessage) {
    state.mapMessage = `${state.mapMessage} ${legacyCarryOverMessage}`.trim();
    state.mapMessageTimer = 4;
  }

  state.lastTravel = {
    destinationNodeId,
    fuelCost: result.fuelCost ?? 0,
    usedFreeTravel,
    freeTravelChargesBefore,
    freeTravelChargesAfter,
    fuelBefore,
    fuelAfterTravel,
    arrivalNodeType
  };

  return {
    ...result,
    usedFreeTravel,
    arrivalNodeType
  };
}
