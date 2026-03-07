import type { Beacon } from '../../game/state/runObjectives';

export type BeaconRule = 'standard' | 'ordered' | 'boosted';

export interface BeaconActivationContext {
  readonly nodeType: string;
  readonly beaconIndex: number;
  readonly beacons: Beacon[];
  readonly currentSpeed: number;
  readonly dashBoost: number;
}

export interface BeaconActivationResult {
  readonly canActivate: boolean;
  readonly reason?: string;
}

const BOOST_LINK_SPEED = 260;
const BOOST_LINK_DASH_THRESHOLD = 0.2;

export function getBeaconRuleForNodeType(nodeType: string): BeaconRule {
  if (nodeType === 'ruin') return 'ordered';
  if (nodeType === 'anomaly') return 'boosted';
  return 'standard';
}

export function nextRequiredBeaconIndex(beacons: Beacon[]): number {
  return Math.max(
    0,
    beacons.findIndex((beacon) => !beacon.activated)
  );
}

export function getBeaconRuleLabel(nodeType: string): string {
  const rule = getBeaconRuleForNodeType(nodeType);
  if (rule === 'ordered') return 'Rule: link relays in order.';
  if (rule === 'boosted') return 'Rule: link relays while boosting.';
  return 'Rule: link any relay in range.';
}

export function canActivateBeacon(context: BeaconActivationContext): BeaconActivationResult {
  const rule = getBeaconRuleForNodeType(context.nodeType);
  if (rule === 'ordered') {
    const requiredIndex = nextRequiredBeaconIndex(context.beacons);
    if (context.beaconIndex !== requiredIndex) {
      const expectedBeacon = context.beacons[requiredIndex];
      return {
        canActivate: false,
        reason: `Relay sequence unstable. Link ${expectedBeacon?.id.toUpperCase() ?? 'the next relay'} first.`
      };
    }
  }

  if (rule === 'boosted') {
    if (context.currentSpeed < BOOST_LINK_SPEED && context.dashBoost < BOOST_LINK_DASH_THRESHOLD) {
      return {
        canActivate: false,
        reason: 'Signal drift too strong. Boost through the relay to lock it.'
      };
    }
  }

  return { canActivate: true };
}
