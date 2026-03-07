import type { RuntimeState } from './runtimeState';

export function hasShieldChargeCapacity(state: RuntimeState): boolean {
  return state.sim.vehicle.shielding >= 2;
}

export function rechargeShieldCharge(state: RuntimeState): void {
  state.shieldChargeAvailable = hasShieldChargeCapacity(state);
}

export function tryConsumeShieldCharge(state: RuntimeState): boolean {
  if (!state.shieldChargeAvailable || !hasShieldChargeCapacity(state)) {
    return false;
  }

  state.shieldChargeAvailable = false;
  state.tookDamageThisRun = true;
  return true;
}
