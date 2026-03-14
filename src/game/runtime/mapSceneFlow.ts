import { currentNodeType, connectedNeighbors } from '../../engine/sim/world';
import { getInstallOffers, installUpgradeForNodeType, repairMostDamagedSubsystem } from '../../engine/sim/vehicle';
import { hasBeaconAutoLink } from './beaconActivation';
import { applyGoalSignalPostGoalRouteHook } from './goalSignal';
import { travelToNodeWithRuntimeEffects, hasCompletedCurrentNode } from './expeditionFlow';
import { updateMapRotation } from './mapRotation';
import { normalizeRuntimeStateAfterVehicleChange } from './vehicleDerivedStats';
import {
  MEDPATCH_HEAL_AMOUNT,
  MEDPATCH_SCRAP_COST,
  resetRunFromCurrentNode,
  tryUseMedPatch,
  type RuntimeState
} from './runtimeState';

export function advanceMapSelection(currentIndex: number, optionCount: number, step: number): number {
  if (optionCount <= 0) {
    return 0;
  }

  return (currentIndex + step + optionCount) % optionCount;
}

export function advanceMapInstallSelection(currentIndex: number, optionCount: number, step: number): number {
  if (optionCount <= 0) {
    return 0;
  }

  return (currentIndex + step + optionCount) % optionCount;
}

export function tryTravelSelectedNode(state: RuntimeState): void {
  const postGoalHookCharges = state.postGoalRouteHookCharges ?? 0;
  if (state.expeditionComplete && postGoalHookCharges <= 0) {
    state.mapMessage = 'Expedition complete. Press N for a new world.';
    state.mapMessageTimer = 3;
    return;
  }

  if (!state.expeditionComplete && !hasCompletedCurrentNode(state)) {
    state.mapMessage = 'Complete this node run first to unlock outbound travel.';
    state.mapMessageTimer = 3;
    return;
  }

  const options = connectedNeighbors(state.sim);
  if (options.length === 0) {
    state.mapMessage = 'No connected routes available.';
    state.mapMessageTimer = 3;
    return;
  }

  const selected = options[state.mapSelectionIndex] ?? options[0];
  if (!selected) {
    return;
  }

  const result = travelToNodeWithRuntimeEffects(state, selected.nodeId);
  if (!result.didTravel) {
    state.mapMessage = result.reason ?? 'Travel failed';
    state.mapMessageTimer = 3;
    return;
  }

  if (state.expeditionComplete) {
    const hookMessage = applyGoalSignalPostGoalRouteHook(state);
    if (hookMessage) {
      state.mapMessage = `${state.mapMessage} ${hookMessage}`.trim();
      state.mapMessageTimer = 4;
    }
  }

  resetRunFromCurrentNode(state);
  state.scene = 'run';
}

export function tryFieldRepairOnMap(state: RuntimeState): void {
  if (state.scene !== 'map') {
    return;
  }

  const result = repairMostDamagedSubsystem(state.sim);
  if (result.didRepair) {
    normalizeRuntimeStateAfterVehicleChange(state);
    state.mapMessage = `Fabricated repair kit: ${result.repairedSubsystem} restored to ${result.newCondition}/3 (-${result.scrapCost} scrap).`;
  } else if (result.reason?.includes('full field condition')) {
    const medPatch = tryUseMedPatch(state);
    state.mapMessage = medPatch.didHeal
      ? `Applied med patch: +${MEDPATCH_HEAL_AMOUNT} HP (-${MEDPATCH_SCRAP_COST} scrap).`
      : medPatch.reason ?? result.reason;
  } else {
    state.mapMessage = result.reason ?? 'Repair failed';
  }

  state.mapMessageTimer = 3;
}

export function tryInstallUpgradeOnMap(state: RuntimeState): void {
  if (state.scene !== 'map') {
    return;
  }

  const nodeType = currentNodeType(state.sim);
  const result = installUpgradeForNodeType(state.sim, nodeType, state.mapInstallSelectionIndex ?? 0);
  if (result.didInstall) {
    normalizeRuntimeStateAfterVehicleChange(state);
    const remainingOffers = getInstallOffers(state.sim, nodeType);
    state.mapInstallSelectionIndex = Math.min(state.mapInstallSelectionIndex ?? 0, Math.max(0, remainingOffers.length - 1));
    state.mapMessage = `Installed ${result.subsystem} module Lv.${result.nextLevel} at ${nodeType} site (-${result.scrapCost} scrap).`;
  } else {
    state.mapMessage = result.reason ?? 'Install failed';
  }

  state.mapMessageTimer = 3;
}

export function stepMapScene(state: RuntimeState, dt: number, rotateInput: -1 | 0 | 1): void {
  if (state.mapMessageTimer > 0) {
    state.mapMessageTimer = Math.max(0, state.mapMessageTimer - dt);
  }

  updateMapRotation(state, rotateInput, dt);
}

export function mapSceneStatusText(state: RuntimeState): string {
  return state.scene === 'map'
    ? 'Choose a connected route and press Enter to travel.'
    : state.mapMessage;
}

export function buildMapScannerFlags(state: RuntimeState): {
  hasAutoLinkScanner: boolean;
  hasCompletedCurrentNode: boolean;
} {
  return {
    hasAutoLinkScanner: hasBeaconAutoLink(state),
    hasCompletedCurrentNode: hasCompletedCurrentNode(state)
  };
}
