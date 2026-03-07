import type { Collectible } from './runtimeState';

export function pullCollectibleTowardTarget(
  collectible: Collectible,
  targetX: number,
  targetY: number,
  dt: number,
  radius: number,
  speed: number
): void {
  if (collectible.collected || radius <= 0 || speed <= 0) {
    return;
  }

  const dx = targetX - collectible.x;
  const dy = targetY - collectible.y;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq === 0 || distanceSq > radius * radius) {
    return;
  }

  const distance = Math.sqrt(distanceSq);
  const step = Math.min(distance, speed * dt);
  collectible.x += (dx / distance) * step;
  collectible.y += (dy / distance) * step;
}
