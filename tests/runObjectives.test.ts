import { describe, expect, it } from 'vitest';
import { canActivateBeacon, getBeaconRuleForNodeType, isPhaseWindowOpen, nextRequiredBeaconIndex } from '../src/engine/sim/runObjectives';
import type { Beacon } from '../src/game/state/runObjectives';

function makeBeacons(): Beacon[] {
  return [
    { id: 'b0', x: 0, y: 0, r: 15, activated: false },
    { id: 'b1', x: 0, y: 0, r: 15, activated: false },
    { id: 'b2', x: 0, y: 0, r: 15, activated: false }
  ];
}

describe('run objective rules', () => {
  it('maps node types to their beacon rules', () => {
    expect(getBeaconRuleForNodeType('town')).toBe('standard');
    expect(getBeaconRuleForNodeType('ruin')).toBe('ordered');
    expect(getBeaconRuleForNodeType('nature')).toBe('airborne');
    expect(getBeaconRuleForNodeType('anomaly')).toBe('boosted');
  });

  it('requires ruin beacons to be linked in sequence', () => {
    const beacons = makeBeacons();

    expect(nextRequiredBeaconIndex(beacons)).toBe(0);

    const outOfOrder = canActivateBeacon({
      nodeType: 'ruin',
      beaconIndex: 2,
      beacons,
      currentSpeed: 0,
      dashBoost: 0,
      isAirborne: false,
      elapsedSeconds: 0
    });

    expect(outOfOrder.canActivate).toBe(false);
    expect(outOfOrder.reason).toContain('B0');

    beacons[0].activated = true;
    expect(nextRequiredBeaconIndex(beacons)).toBe(1);
  });

  it('requires anomaly beacons to be linked with boost or momentum', () => {
    const beacons = makeBeacons();

    const slow = canActivateBeacon({
      nodeType: 'anomaly',
      beaconIndex: 0,
      beacons,
      currentSpeed: 180,
      dashBoost: 0.1,
      isAirborne: false,
      elapsedSeconds: 0
    });
    expect(slow.canActivate).toBe(false);
    expect(slow.reason).toContain('Boost');

    const closedWindow = canActivateBeacon({
      nodeType: 'anomaly',
      beaconIndex: 1,
      beacons,
      currentSpeed: 280,
      dashBoost: 0.35,
      isAirborne: false,
      elapsedSeconds: 0.9
    });
    expect(closedWindow.canActivate).toBe(false);
    expect(closedWindow.reason).toContain('sync window');

    const fast = canActivateBeacon({
      nodeType: 'anomaly',
      beaconIndex: 0,
      beacons,
      currentSpeed: 280,
      dashBoost: 0,
      isAirborne: false,
      elapsedSeconds: 0.1
    });
    expect(fast.canActivate).toBe(true);
  });

  it('requires nature beacons to be linked while airborne', () => {
    const beacons = makeBeacons();

    const grounded = canActivateBeacon({
      nodeType: 'nature',
      beaconIndex: 0,
      beacons,
      currentSpeed: 120,
      dashBoost: 0,
      isAirborne: false,
      elapsedSeconds: 0
    });
    expect(grounded.canActivate).toBe(false);
    expect(grounded.reason).toContain('Jump through');

    const airborne = canActivateBeacon({
      nodeType: 'nature',
      beaconIndex: 0,
      beacons,
      currentSpeed: 120,
      dashBoost: 0,
      isAirborne: true,
      elapsedSeconds: 0
    });
    expect(airborne.canActivate).toBe(true);
  });

  it('opens anomaly sync windows deterministically per beacon index', () => {
    expect(isPhaseWindowOpen(0.1, 0)).toBe(true);
    expect(isPhaseWindowOpen(0.9, 0)).toBe(false);
    expect(isPhaseWindowOpen(0.1, 1)).toBe(true);
    expect(isPhaseWindowOpen(0.5, 1)).toBe(false);
  });
});
