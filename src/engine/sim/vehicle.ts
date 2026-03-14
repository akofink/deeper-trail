import {
  VEHICLE_SUBSYSTEM_KEYS,
  type GameState,
  type VehicleCondition,
  type VehicleSubsystemKey,
  type VehicleSubsystems
} from '../../game/state/gameState';

export const MAX_SUBSYSTEM_CONDITION = 3;
export const FIELD_REPAIR_SCRAP_COST = 1;
export const MAX_SUBSYSTEM_LEVEL = 4;

const DAMAGE_PRIORITY_BY_NODE_TYPE: Record<string, VehicleSubsystemKey> = {
  anomaly: 'shielding',
  nature: 'suspension',
  ruin: 'frame',
  town: 'engine'
};

const INSTALL_PRIORITY_BY_NODE_TYPE: Record<string, VehicleSubsystemKey[]> = {
  anomaly: ['shielding', 'scanner'],
  nature: ['suspension', 'storage'],
  ruin: ['frame', 'scanner'],
  town: ['engine', 'storage']
};

export interface VehicleRepairResult {
  readonly didRepair: boolean;
  readonly repairedSubsystem?: VehicleSubsystemKey;
  readonly scrapCost?: number;
  readonly newCondition?: number;
  readonly reason?: string;
}

export interface VehicleInstallOffer {
  readonly priorityIndex: number;
  readonly subsystem: VehicleSubsystemKey;
  readonly currentLevel: number;
  readonly nextLevel: number;
  readonly scrapCost: number;
}

export interface VehicleInstallResult extends VehicleInstallOffer {
  readonly didInstall: boolean;
  readonly reason?: string;
}

function clampCondition(value: number): number {
  return Math.max(0, Math.min(MAX_SUBSYSTEM_CONDITION, value));
}

export function getMaxHealth(vehicle: VehicleSubsystems): number {
  return 2 + vehicle.frame;
}

export function getFuelCapacity(vehicle: VehicleSubsystems): number {
  return 32 + vehicle.engine * 8;
}

export function hasAutoLinkScanner(vehicle: VehicleSubsystems): boolean {
  return vehicle.scanner >= 3;
}

export function damageSubsystem(state: GameState, subsystem: VehicleSubsystemKey, amount = 1): number {
  const current = state.vehicleCondition[subsystem];
  const next = clampCondition(current - amount);
  state.vehicleCondition[subsystem] = next;
  return next;
}

export function repairSubsystem(state: GameState, subsystem: VehicleSubsystemKey, amount = 1): number {
  const current = state.vehicleCondition[subsystem];
  const next = clampCondition(current + amount);
  state.vehicleCondition[subsystem] = next;
  return next;
}

export function getDamageSubsystemForNodeType(nodeType: string): VehicleSubsystemKey {
  return DAMAGE_PRIORITY_BY_NODE_TYPE[nodeType] ?? 'engine';
}

export function damageSubsystemForNodeType(state: GameState, nodeType: string, amount = 1): VehicleSubsystemKey {
  const subsystem = getDamageSubsystemForNodeType(nodeType);
  damageSubsystem(state, subsystem, amount);
  return subsystem;
}

export function getMostDamagedSubsystem(condition: VehicleCondition): VehicleSubsystemKey | null {
  let selected: VehicleSubsystemKey | null = null;
  let lowest = MAX_SUBSYSTEM_CONDITION;

  for (const subsystem of VEHICLE_SUBSYSTEM_KEYS) {
    const value = condition[subsystem];
    if (value < lowest) {
      lowest = value;
      selected = subsystem;
    }
  }

  return selected;
}

function getInstallPriority(nodeType: string): VehicleSubsystemKey[] {
  return INSTALL_PRIORITY_BY_NODE_TYPE[nodeType] ?? ['engine', 'frame'];
}

function compareInstallOffers(a: VehicleInstallOffer, b: VehicleInstallOffer): number {
  if (a.currentLevel !== b.currentLevel) {
    return a.currentLevel - b.currentLevel;
  }

  return a.priorityIndex - b.priorityIndex;
}

export function hasAnyUpgradeableSubsystem(state: GameState): boolean {
  return VEHICLE_SUBSYSTEM_KEYS.some((subsystem) => state.vehicle[subsystem] < MAX_SUBSYSTEM_LEVEL);
}

export function getInstallOffers(state: GameState, nodeType: string): VehicleInstallOffer[] {
  return getInstallPriority(nodeType)
    .flatMap((subsystem, priorityIndex) => {
      const currentLevel = state.vehicle[subsystem];
      if (currentLevel >= MAX_SUBSYSTEM_LEVEL) {
        return [];
      }

      return [
        {
          priorityIndex,
          subsystem,
          currentLevel,
          nextLevel: currentLevel + 1,
          scrapCost: currentLevel + 1
        }
      ];
    })
    .sort(compareInstallOffers);
}

export function getInstallOffer(state: GameState, nodeType: string, selectionIndex = 0): VehicleInstallOffer | null {
  const offers = getInstallOffers(state, nodeType);
  if (offers.length === 0) {
    return null;
  }

  const normalizedIndex = Math.max(0, Math.min(selectionIndex, offers.length - 1));
  return offers[normalizedIndex] ?? null;
}

export function repairMostDamagedSubsystem(state: GameState): VehicleRepairResult {
  if (state.scrap < FIELD_REPAIR_SCRAP_COST) {
    return {
      didRepair: false,
      reason: `Need ${FIELD_REPAIR_SCRAP_COST} scrap for a field repair kit`
    };
  }

  const subsystem = getMostDamagedSubsystem(state.vehicleCondition);
  if (!subsystem || state.vehicleCondition[subsystem] >= MAX_SUBSYSTEM_CONDITION) {
    return {
      didRepair: false,
      reason: 'Vehicle is already at full field condition'
    };
  }

  state.scrap -= FIELD_REPAIR_SCRAP_COST;
  state.vehicleCondition[subsystem] = clampCondition(state.vehicleCondition[subsystem] + 1);

  return {
    didRepair: true,
    repairedSubsystem: subsystem,
    scrapCost: FIELD_REPAIR_SCRAP_COST,
    newCondition: state.vehicleCondition[subsystem]
  };
}

export function installUpgradeForNodeType(state: GameState, nodeType: string, selectionIndex = 0): VehicleInstallResult {
  const offer = getInstallOffer(state, nodeType, selectionIndex);
  if (!offer) {
    const hasRemainingUpgrades = hasAnyUpgradeableSubsystem(state);
    return {
      didInstall: false,
      priorityIndex: 0,
      subsystem: getInstallPriority(nodeType)[0] ?? 'engine',
      currentLevel: MAX_SUBSYSTEM_LEVEL,
      nextLevel: MAX_SUBSYSTEM_LEVEL,
      scrapCost: MAX_SUBSYSTEM_LEVEL,
      reason: hasRemainingUpgrades
        ? 'This site has no further installs for your current build. Try a different biome site.'
        : 'All vehicle subsystems are installed at max level'
    };
  }

  if (state.scrap < offer.scrapCost) {
    return {
      didInstall: false,
      ...offer,
      reason: `Need ${offer.scrapCost} scrap to install ${offer.subsystem} module Lv.${offer.nextLevel}`
    };
  }

  state.scrap -= offer.scrapCost;
  state.vehicle[offer.subsystem] = offer.nextLevel;
  if (state.vehicleCondition[offer.subsystem] < MAX_SUBSYSTEM_CONDITION) {
    state.vehicleCondition[offer.subsystem] += 1;
  }
  state.fuelCapacity = getFuelCapacity(state.vehicle);
  state.fuel = offer.subsystem === 'engine' ? state.fuelCapacity : Math.min(state.fuelCapacity, state.fuel);

  return {
    didInstall: true,
    ...offer
  };
}
