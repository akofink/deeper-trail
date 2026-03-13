import { VEHICLE_SUBSYSTEM_KEYS, type GameState } from '../../game/state/gameState';

const SHARE_CODE_VERSION = 'DT1';
const MAX_SEED_SEGMENT_LENGTH = 12;

function normalizedSeedSegment(seed: string): string {
  const normalized = seed.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length === 0) {
    return 'SEEDLESS';
  }
  return normalized.slice(0, MAX_SEED_SEGMENT_LENGTH);
}

function encodeSubsystemLevels(state: GameState): string {
  return VEHICLE_SUBSYSTEM_KEYS.map((subsystem) => state.vehicle[subsystem].toString(36).toUpperCase()).join('');
}

function encodeSubsystemCondition(state: GameState): string {
  return VEHICLE_SUBSYSTEM_KEYS.map((subsystem) => state.vehicleCondition[subsystem].toString(36).toUpperCase()).join('');
}

export function buildSeedBuildShareCode(state: GameState): string {
  const seed = normalizedSeedSegment(state.seed);
  const levels = encodeSubsystemLevels(state);
  const condition = encodeSubsystemCondition(state);
  return `${SHARE_CODE_VERSION}-${seed}-${levels}-${condition}`;
}
