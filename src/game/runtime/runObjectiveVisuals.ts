import {
  anomalyLockProgressRatio,
  getBeaconRuleForNodeType,
  isPhaseWindowOpen,
  isSteadyLinkReady,
  nextRequiredBeaconIndex,
  type BeaconRule
} from '../../engine/sim/runObjectives';
import { currentNodeType } from '../../engine/sim/world';
import type { RuntimeState } from './runtimeState';

export interface RunObjectiveVisualState {
  nodeType: string;
  beaconRule: BeaconRule;
  nextBeaconIndex: number;
  serviceStopReady: boolean;
  serviceStops: Array<{
    id: string;
    x: number;
    width: number;
    progressRatio: number;
    serviced: boolean;
  }>;
  impactPlates: Array<{
    id: string;
    x: number;
    width: number;
    shattered: boolean;
  }>;
  canopyLifts: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    progressRatio: number;
    charted: boolean;
    pulseRadius: number;
  }>;
  syncGates: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    stabilized: boolean;
    phaseOpen: boolean;
  }>;
  beacons: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
    activated: boolean;
    isNextRequired: boolean;
    steadyReady: boolean;
    anomalyWindowOpen: boolean;
    anomalyScanLocked: boolean;
    anomalyScanProgressRatio: number;
    labelText: string;
    labelFill: string;
  }>;
}

function beaconLabelFill(beaconRule: BeaconRule, steadyReady: boolean, isNextRequired: boolean): string {
  if (beaconRule === 'boosted') return '#312e81';
  if (beaconRule === 'steady') return steadyReady ? '#134e4a' : '#115e59';
  return isNextRequired ? '#92400e' : '#111827';
}

export function buildRunObjectiveVisualState(state: RuntimeState): RunObjectiveVisualState {
  const nodeType = currentNodeType(state.sim);
  const beaconRule = getBeaconRuleForNodeType(nodeType);
  const nextBeaconIndex = nextRequiredBeaconIndex(state.beacons);
  const serviceStopReady = isSteadyLinkReady(Math.abs(state.player.vx), !state.player.onGround);

  return {
    nodeType,
    beaconRule,
    nextBeaconIndex,
    serviceStopReady,
    serviceStops: state.serviceStops.map((stop) => ({
      id: stop.id,
      x: stop.x,
      width: stop.w,
      progressRatio: stop.progress / 0.7,
      serviced: stop.serviced
    })),
    impactPlates: state.impactPlates.map((plate) => ({
      id: plate.id,
      x: plate.x,
      width: plate.w,
      shattered: plate.shattered
    })),
    canopyLifts: state.canopyLifts.map((lift) => ({
      id: lift.id,
      x: lift.x,
      y: lift.y,
      width: lift.w,
      height: lift.h,
      progressRatio: lift.progress / 0.6,
      charted: lift.charted,
      pulseRadius: Math.min(lift.w, lift.h) * 0.24 + Math.sin(state.elapsedSeconds * 4 + lift.x * 0.02) * 4
    })),
    syncGates: state.syncGates.map((gate, index) => ({
      id: gate.id,
      x: gate.x,
      y: gate.y,
      width: gate.w,
      height: gate.h,
      stabilized: gate.stabilized,
      phaseOpen: isPhaseWindowOpen(state.elapsedSeconds, index)
    })),
    beacons: state.beacons.map((beacon, index) => {
      const isNextRequired = beaconRule === 'ordered' && !beacon.activated && index === nextBeaconIndex;
      const steadyReady = beaconRule === 'steady' && !beacon.activated && serviceStopReady;
      return {
        id: beacon.id,
        x: beacon.x,
        y: beacon.y,
        radius: beacon.r,
        activated: beacon.activated,
        isNextRequired,
        steadyReady,
        anomalyWindowOpen: nodeType === 'anomaly' && isPhaseWindowOpen(state.elapsedSeconds, index),
        anomalyScanLocked: Boolean(beacon.scanLocked),
        anomalyScanProgressRatio: anomalyLockProgressRatio(beacon.scanProgress ?? 0),
        labelText: beaconRule === 'steady' ? 'S' : `${index + 1}`,
        labelFill: beaconLabelFill(beaconRule, steadyReady, isNextRequired)
      };
    })
  };
}
