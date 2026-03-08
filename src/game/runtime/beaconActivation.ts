import { canActivateBeacon, getBeaconRuleLabel } from '../../engine/sim/runObjectives';
import { currentNodeType } from '../../engine/sim/world';
import { hasAutoLinkScanner } from '../../engine/sim/vehicle';
import type { RuntimeState } from './runtimeState';
import { beaconInteractRadius } from './vehicleDerivedStats';

export type BeaconActivationTrigger = 'manual' | 'auto';

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function hasBeaconAutoLink(state: RuntimeState): boolean {
  return hasAutoLinkScanner(state.sim.vehicle);
}

export function attemptBeaconActivation(
  state: RuntimeState,
  trigger: BeaconActivationTrigger = 'manual'
): boolean {
  if (state.scene !== 'run' || state.mode !== 'playing') return false;

  const px = state.player.x + state.player.w * 0.5;
  const py = state.player.y + state.player.h * 0.5;
  const interactRadius = beaconInteractRadius(state);
  const nodeType = currentNodeType(state.sim);
  let sawInRangeBeacon = false;

  for (let index = 0; index < state.beacons.length; index += 1) {
    const beacon = state.beacons[index];
    if (beacon.activated) continue;

    const rr = (beacon.r + interactRadius) * (beacon.r + interactRadius);
    if (distanceSq(px, py, beacon.x, beacon.y) > rr) continue;
    sawInRangeBeacon = true;

    const activation = canActivateBeacon({
      nodeType,
      beaconIndex: index,
      beacons: state.beacons,
      currentSpeed: Math.abs(state.player.vx),
      dashBoost: state.dashBoost,
      isAirborne: !state.player.onGround,
      elapsedSeconds: state.elapsedSeconds,
      scanLocked: beacon.scanLocked
    });

    if (!activation.canActivate) {
      if (trigger === 'manual') {
        state.mapMessage = activation.reason ?? getBeaconRuleLabel(nodeType);
        state.mapMessageTimer = 2.2;
      }
      continue;
    }

    beacon.activated = true;
    state.score += 15;
    const completed = state.beacons.filter((item) => item.activated).length;
    state.mapMessage =
      trigger === 'auto'
        ? `Scanner auto-linked ${beacon.id.toUpperCase()} (${completed}/${state.beacons.length}).`
        : `Beacon ${beacon.id.toUpperCase()} linked (${completed}/${state.beacons.length}).`;
    state.mapMessageTimer = 2.5;
    return true;
  }

  if (trigger === 'manual' && !sawInRangeBeacon) {
    state.mapMessage = 'No inactive beacon in range.';
    state.mapMessageTimer = 1.5;
  }

  return false;
}
