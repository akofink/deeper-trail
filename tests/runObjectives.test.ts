import { describe, expect, it } from 'vitest';
import { canActivateBeacon, getBeaconRuleForNodeType, nextRequiredBeaconIndex } from '../src/engine/sim/runObjectives';
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
      dashBoost: 0
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
      dashBoost: 0.1
    });
    expect(slow.canActivate).toBe(false);

    const fast = canActivateBeacon({
      nodeType: 'anomaly',
      beaconIndex: 0,
      beacons,
      currentSpeed: 280,
      dashBoost: 0
    });
    expect(fast.canActivate).toBe(true);
  });
});
