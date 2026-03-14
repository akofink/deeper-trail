import type { GameState, NodeTypeKey, VehicleSubsystemKey } from '../../game/state/gameState';
import { revealBiomeIntel, asNodeTypeKey } from './exploration';
import { connectedNeighbors, findNode } from './world';
import { getMostDamagedSubsystem, MAX_SUBSYSTEM_CONDITION, repairSubsystem } from './vehicle';

export interface ArrivalSiteBonusPreview {
  subsystem: VehicleSubsystemKey;
  requiredLevel: number;
  active: boolean;
  summary: string;
}

const ARRIVAL_SITE_BONUS_RULES: Record<NodeTypeKey, { subsystem: VehicleSubsystemKey; requiredLevel: number; summary: string }> = {
  town: {
    subsystem: 'engine',
    requiredLevel: 2,
    summary: 'adds +4 fuel on arrival'
  },
  ruin: {
    subsystem: 'storage',
    requiredLevel: 2,
    summary: 'sifts +1 scrap on arrival'
  },
  nature: {
    subsystem: 'suspension',
    requiredLevel: 2,
    summary: 'repairs 1 damaged module condition on arrival'
  },
  anomaly: {
    subsystem: 'scanner',
    requiredLevel: 2,
    summary: 'reveals connected route intel on arrival'
  }
};

export function arrivalSiteBonusPreview(state: GameState, nodeType: string): ArrivalSiteBonusPreview {
  const normalizedNodeType = asNodeTypeKey(nodeType);
  const rule = ARRIVAL_SITE_BONUS_RULES[normalizedNodeType];

  return {
    subsystem: rule.subsystem,
    requiredLevel: rule.requiredLevel,
    active: state.vehicle[rule.subsystem] >= rule.requiredLevel,
    summary: rule.summary
  };
}

function revealConnectedRouteIntel(state: GameState): string {
  const revealedTypes = new Set<string>();

  for (const neighbor of connectedNeighbors(state)) {
    const node = findNode(state, neighbor.nodeId);
    if (!node) {
      continue;
    }

    revealBiomeIntel(state, node.type);
    revealedTypes.add(node.type);
  }

  const labels = Array.from(revealedTypes).sort();
  if (labels.length === 0) {
    return ' Scanner echo mapped the local field.';
  }

  return ` Scanner echo mapped ${labels.join('/')} route intel.`;
}

export function applyArrivalSiteBonus(state: GameState, nodeType: string): string {
  const bonus = arrivalSiteBonusPreview(state, nodeType);
  if (!bonus.active) {
    return '';
  }

  const normalizedNodeType = asNodeTypeKey(nodeType);
  if (normalizedNodeType === 'town') {
    const fuelBefore = state.fuel;
    state.fuel = Math.min(state.fuelCapacity, state.fuel + 4);
    const gainedFuel = state.fuel - fuelBefore;
    return gainedFuel > 0 ? ` Engine tune-up cache added +${gainedFuel} fuel.` : ' Engine tune-up cache found the tank already topped off.';
  }

  if (normalizedNodeType === 'ruin') {
    state.scrap += 1;
    return ' Salvage rack sifted +1 extra scrap.';
  }

  if (normalizedNodeType === 'nature') {
    const subsystem = getMostDamagedSubsystem(state.vehicleCondition);
    if (!subsystem || state.vehicleCondition[subsystem] >= MAX_SUBSYSTEM_CONDITION) {
      return ' Spring shelter found no damaged modules to reset.';
    }

    repairSubsystem(state, subsystem, 1);
    return ` Spring shelter reset ${subsystem} condition +1.`;
  }

  return revealConnectedRouteIntel(state);
}
