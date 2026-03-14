import type { ServiceStop } from '../state/runObjectives';

export const SERVICE_STOP_HOLD_SECONDS = 0.7;
const SERVICE_STOP_DECAY_PER_SECOND = 1.8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function usesServiceStops(nodeType: string): boolean {
  return nodeType === 'town';
}

export function totalServiceStopProgress(stops: ServiceStop[]): { completed: number; total: number } {
  return {
    completed: stops.filter((stop) => stop.serviced).length,
    total: stops.length
  };
}

export function updateServiceStopProgress(
  stop: ServiceStop,
  dt: number,
  inZone: boolean,
  canService: boolean,
  holdSeconds = SERVICE_STOP_HOLD_SECONDS
): { completedNow: boolean } {
  if (stop.serviced) {
    stop.progress = holdSeconds;
    return { completedNow: false };
  }

  if (inZone && canService) {
    stop.progress = clamp(stop.progress + dt, 0, holdSeconds);
  } else {
    stop.progress = clamp(stop.progress - dt * SERVICE_STOP_DECAY_PER_SECOND, 0, holdSeconds);
  }

  if (stop.progress >= holdSeconds) {
    stop.progress = holdSeconds;
    stop.serviced = true;
    return { completedNow: true };
  }

  return { completedNow: false };
}
