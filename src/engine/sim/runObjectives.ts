import type { Beacon } from '../../game/state/runObjectives';

export type BeaconRule = 'standard' | 'ordered' | 'boosted' | 'airborne' | 'steady';

export interface BeaconActivationContext {
  readonly nodeType: string;
  readonly beaconIndex: number;
  readonly beacons: Beacon[];
  readonly currentSpeed: number;
  readonly dashBoost: number;
  readonly isAirborne: boolean;
  readonly elapsedSeconds: number;
}

export interface BeaconActivationResult {
  readonly canActivate: boolean;
  readonly reason?: string;
}

const BOOST_LINK_SPEED = 260;
const BOOST_LINK_DASH_THRESHOLD = 0.2;
const PHASE_LINK_PERIOD_SECONDS = 1.6;
const PHASE_LINK_OPEN_SECONDS = 0.48;
const PHASE_LINK_OFFSET_SECONDS = 0.23;
const STEADY_LINK_MAX_SPEED = 85;

export function getBeaconRuleForNodeType(nodeType: string): BeaconRule {
  if (nodeType === 'town') return 'steady';
  if (nodeType === 'ruin') return 'ordered';
  if (nodeType === 'nature') return 'airborne';
  if (nodeType === 'anomaly') return 'boosted';
  return 'standard';
}

export function isPhaseWindowOpen(elapsedSeconds: number, beaconIndex: number): boolean {
  const phaseTime = (elapsedSeconds + beaconIndex * PHASE_LINK_OFFSET_SECONDS) % PHASE_LINK_PERIOD_SECONDS;
  return phaseTime >= 0 && phaseTime < PHASE_LINK_OPEN_SECONDS;
}

export function nextRequiredBeaconIndex(beacons: Beacon[]): number {
  return Math.max(
    0,
    beacons.findIndex((beacon) => !beacon.activated)
  );
}

export function getBeaconRuleLabel(nodeType: string): string {
  const rule = getBeaconRuleForNodeType(nodeType);
  if (rule === 'steady') return 'Rule: settle beside relays and link while steady.';
  if (rule === 'ordered') return 'Rule: link relays in order.';
  if (rule === 'airborne') return 'Rule: link relays while airborne.';
  if (rule === 'boosted') return 'Rule: link relays during sync windows while boosting.';
  return 'Rule: link any relay in range.';
}

export function getObjectiveSummary(nodeType: string): string {
  const rule = getBeaconRuleForNodeType(nodeType);
  if (rule === 'steady') return 'Steady relays + service bays';
  if (rule === 'ordered') return 'Ordered relays';
  if (rule === 'airborne') return 'Air relays + canopy lifts';
  if (rule === 'boosted') return 'Boost-sync relays + sync gates';
  return 'Relay links';
}

export function isSteadyLinkReady(currentSpeed: number, isAirborne: boolean): boolean {
  return !isAirborne && currentSpeed <= STEADY_LINK_MAX_SPEED;
}

export function canActivateBeacon(context: BeaconActivationContext): BeaconActivationResult {
  const rule = getBeaconRuleForNodeType(context.nodeType);

  if (rule === 'steady' && !isSteadyLinkReady(context.currentSpeed, context.isAirborne)) {
    return {
      canActivate: false,
      reason: context.isAirborne
        ? 'Relay jitters in the air. Settle on the road, then link it.'
        : 'Relay still drifting. Ease off and stabilize beside it before linking.'
    };
  }

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
    if (!isPhaseWindowOpen(context.elapsedSeconds, context.beaconIndex)) {
      return {
        canActivate: false,
        reason: 'Relay phase closed. Hold boost and wait for the sync window.'
      };
    }
  }

  if (rule === 'airborne' && !context.isAirborne) {
    return {
      canActivate: false,
      reason: 'Canopy interference active. Jump through the relay to lock it.'
    };
  }

  return { canActivate: true };
}
