import type { RuntimeState } from './runtimeState';

const MAP_ROTATION_ACCEL = 4.3;
const MAP_ROTATION_VELOCITY_BOOST = 1.35;
const MAP_ROTATION_MAX_ACCEL_BONUS = 3.1;
const MAP_ROTATION_HOLD_DAMPING = 0.91;
const MAP_ROTATION_IDLE_DAMPING = 0.82;

export function updateMapRotation(state: RuntimeState, rotateInput: -1 | 0 | 1, dt: number): void {
  const accelBonus = Math.min(MAP_ROTATION_MAX_ACCEL_BONUS, Math.abs(state.mapRotationVelocity) * MAP_ROTATION_VELOCITY_BOOST);
  const rotateAccel = MAP_ROTATION_ACCEL + accelBonus;

  state.mapRotationVelocity += rotateInput * rotateAccel * dt;
  const damping = rotateInput === 0 ? MAP_ROTATION_IDLE_DAMPING : MAP_ROTATION_HOLD_DAMPING;
  state.mapRotationVelocity *= Math.pow(damping, dt * 60);
  state.mapRotation += state.mapRotationVelocity * dt;
}
