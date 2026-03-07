const TWO_PI = Math.PI * 2;

function normalizeAngle(angle: number): number {
  let normalized = angle % TWO_PI;
  if (normalized < 0) {
    normalized += TWO_PI;
  }
  return normalized;
}

export function advanceWheelRotation(currentRotation: number, velocityX: number, dt: number, wheelRadius: number): number {
  if (wheelRadius <= 0 || velocityX === 0 || dt === 0) {
    return normalizeAngle(currentRotation);
  }

  return normalizeAngle(currentRotation + (velocityX / wheelRadius) * dt);
}
