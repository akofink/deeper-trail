import type { CanopyLift } from '../state/runObjectives';

export const CANOPY_LIFT_HOLD_SECONDS = 0.6;
const CANOPY_LIFT_DECAY_PER_SECOND = 1.6;
const CANOPY_LIFT_ACCELERATION = 540;
const CANOPY_LIFT_MAX_RISE_SPEED = -180;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function usesCanopyLifts(nodeType: string): boolean {
  return nodeType === 'nature';
}

export function totalCanopyLiftProgress(lifts: CanopyLift[]): { completed: number; total: number } {
  return {
    completed: lifts.filter((lift) => lift.charted).length,
    total: lifts.length
  };
}

export function isInsideCanopyLift(
  lift: CanopyLift,
  playerBounds: { x: number; y: number; w: number; h: number }
): boolean {
  return intersects(playerBounds, {
    x: lift.x - lift.w * 0.5,
    y: lift.y - lift.h * 0.5,
    w: lift.w,
    h: lift.h
  });
}

export function applyCanopyLiftAssist(currentVy: number, dt: number): number {
  return Math.max(CANOPY_LIFT_MAX_RISE_SPEED, currentVy - CANOPY_LIFT_ACCELERATION * dt);
}

export function updateCanopyLiftProgress(
  lift: CanopyLift,
  dt: number,
  inZone: boolean,
  isAirborne: boolean
): { completedNow: boolean } {
  if (lift.charted) {
    lift.progress = CANOPY_LIFT_HOLD_SECONDS;
    return { completedNow: false };
  }

  if (inZone && isAirborne) {
    lift.progress = clamp(lift.progress + dt, 0, CANOPY_LIFT_HOLD_SECONDS);
  } else {
    lift.progress = clamp(lift.progress - dt * CANOPY_LIFT_DECAY_PER_SECOND, 0, CANOPY_LIFT_HOLD_SECONDS);
  }

  if (lift.progress >= CANOPY_LIFT_HOLD_SECONDS) {
    lift.progress = CANOPY_LIFT_HOLD_SECONDS;
    lift.charted = true;
    return { completedNow: true };
  }

  return { completedNow: false };
}
