import { getMaxHealth } from '../../engine/sim/vehicle';
import type { RuntimeState } from './runtimeState';

const DASH_SPEED_MULTIPLIER = 2.1;
const BASE_PLAYER_SPEED = 235;
const BASE_JUMP_SPEED = 420;

export function beaconInteractRadius(state: RuntimeState): number {
  return 40 + Math.max(0, state.sim.vehicle.scanner - 1) * 10;
}

export function runSpeedForState(state: RuntimeState): number {
  return BASE_PLAYER_SPEED + Math.max(0, state.sim.vehicle.engine - 1) * 18;
}

export function dashSpeedForState(state: RuntimeState): number {
  return runSpeedForState(state) * DASH_SPEED_MULTIPLIER;
}

export function jumpSpeedForState(state: RuntimeState): number {
  return BASE_JUMP_SPEED + Math.max(0, state.sim.vehicle.suspension - 1) * 18;
}

export function hazardInvulnerabilitySeconds(state: RuntimeState): number {
  return 1 + Math.max(0, state.sim.vehicle.shielding - 1) * 0.2;
}

export function collectibleMagnetRadius(state: RuntimeState): number {
  return state.sim.vehicle.storage >= 2 ? 52 + Math.max(0, state.sim.vehicle.storage - 2) * 18 : 0;
}

export function collectibleMagnetSpeed(state: RuntimeState): number {
  return state.sim.vehicle.storage >= 2 ? 145 + Math.max(0, state.sim.vehicle.storage - 2) * 55 : 0;
}

export function scrapGainPerCollectible(state: RuntimeState): number {
  return state.sim.vehicle.storage >= 3 ? 2 : 1;
}

export function normalizeRuntimeStateAfterVehicleChange(state: RuntimeState): void {
  state.health = Math.min(state.health, getMaxHealth(state.sim.vehicle));
}
