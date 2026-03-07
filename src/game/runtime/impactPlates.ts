import type { ImpactPlate } from '../state/runObjectives';

const IMPACT_PLATE_MIN_FALL_SPEED = 235;

export function usesImpactPlates(nodeType: string): boolean {
  return nodeType === 'ruin';
}

export function totalImpactPlateProgress(plates: ImpactPlate[]): { completed: number; total: number } {
  return {
    completed: plates.filter((plate) => plate.shattered).length,
    total: plates.length
  };
}

export function isWithinImpactPlate(plate: ImpactPlate, playerCenterX: number): boolean {
  return Math.abs(playerCenterX - plate.x) <= plate.w * 0.5;
}

export function canShatterImpactPlate(
  plate: ImpactPlate,
  playerCenterX: number,
  landingSpeed: number,
  landedThisFrame: boolean
): boolean {
  if (plate.shattered || !landedThisFrame) {
    return false;
  }

  return isWithinImpactPlate(plate, playerCenterX) && landingSpeed >= IMPACT_PLATE_MIN_FALL_SPEED;
}

export function impactPlatePrompt(plate: ImpactPlate, playerCenterX: number, playerOnGround: boolean): string | null {
  if (plate.shattered || !isWithinImpactPlate(plate, playerCenterX)) {
    return null;
  }

  return playerOnGround
    ? 'Impact plate intact.\nJump and land hard on the slab to crack it open.'
    : 'Impact plate below.\nDrop onto the slab with a hard landing.';
}
