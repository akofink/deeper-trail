export const RUN_ACCEL = 720;
export const RUN_DECEL = 1850;
export const AIR_ACCEL = 840;
export const AIR_TURN_ACCEL = 1280;
export const AIR_DECEL = 700;

function approach(value: number, target: number, delta: number): number {
  if (value < target) {
    return Math.min(target, value + delta);
  }
  return Math.max(target, value - delta);
}

export function advanceHorizontalVelocity(
  currentVelocity: number,
  targetSpeed: number,
  dt: number,
  onGround: boolean
): number {
  const direction = Math.sign(targetSpeed);
  const currentDirection = Math.sign(currentVelocity);
  const isReversingInAir = !onGround && direction !== 0 && currentDirection !== 0 && currentDirection !== direction;
  const accel = onGround
    ? targetSpeed === 0
      ? RUN_DECEL
      : RUN_ACCEL
    : targetSpeed === 0
      ? AIR_DECEL
      : isReversingInAir
        ? AIR_TURN_ACCEL
        : AIR_ACCEL;

  return approach(currentVelocity, targetSpeed, accel * dt);
}
