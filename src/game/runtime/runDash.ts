export function shouldStartDash(dashHeld: boolean, wasDashHeld: boolean, dashEnergy: number): boolean {
  return dashHeld && !wasDashHeld && dashEnergy > 0.05;
}

export function shouldContinueDash(dashHeld: boolean, dashBoost: number, dashEnergy: number): boolean {
  return dashHeld && dashBoost > 0 && dashEnergy > 0.01;
}

export function dashEntryEnergyCost(currentSpeed: number, runSpeed: number): number {
  const safeRunSpeed = Math.max(1, runSpeed);
  const speedRatio = Math.min(1, Math.abs(currentSpeed) / safeRunSpeed);
  return 0.08 + speedRatio * 0.2;
}
