import { getMaxHealth } from '../../engine/sim/vehicle';
import type { RuntimeState } from './runtimeState';

const DASH_SPEED_MULTIPLIER = 2.1;
const BASE_PLAYER_SPEED = 235;
const BASE_JUMP_SPEED = 420;
const BASE_SERVICE_STOP_HOLD_SECONDS = 0.7;
const BASE_CANOPY_LIFT_HOLD_SECONDS = 0.6;
const BASE_IMPACT_PLATE_MIN_FALL_SPEED = 235;
const BASE_SYNC_GATE_MIN_SPEED = 210;
const BASE_SYNC_GATE_MIN_DASH_BOOST = 0.18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

export function serviceStopHoldSecondsForState(state: RuntimeState): number {
  return clamp(BASE_SERVICE_STOP_HOLD_SECONDS - Math.max(0, state.sim.vehicle.engine - 1) * 0.08, 0.46, BASE_SERVICE_STOP_HOLD_SECONDS);
}

export function canopyLiftHoldSecondsForState(state: RuntimeState): number {
  return clamp(
    BASE_CANOPY_LIFT_HOLD_SECONDS - Math.max(0, state.sim.vehicle.suspension - 1) * 0.06,
    0.42,
    BASE_CANOPY_LIFT_HOLD_SECONDS
  );
}

export function impactPlateMinFallSpeedForState(state: RuntimeState): number {
  return clamp(
    BASE_IMPACT_PLATE_MIN_FALL_SPEED - Math.max(0, state.sim.vehicle.frame - 1) * 20,
    175,
    BASE_IMPACT_PLATE_MIN_FALL_SPEED
  );
}

export function syncGateMinSpeedForState(state: RuntimeState): number {
  return clamp(BASE_SYNC_GATE_MIN_SPEED - Math.max(0, state.sim.vehicle.shielding - 1) * 15, 165, BASE_SYNC_GATE_MIN_SPEED);
}

export function syncGateMinDashBoostForState(state: RuntimeState): number {
  return clamp(
    BASE_SYNC_GATE_MIN_DASH_BOOST - Math.max(0, state.sim.vehicle.shielding - 1) * 0.03,
    0.09,
    BASE_SYNC_GATE_MIN_DASH_BOOST
  );
}

export function normalizeRuntimeStateAfterVehicleChange(state: RuntimeState): void {
  state.health = Math.min(state.health, getMaxHealth(state.sim.vehicle));
}
