import { describe, expect, it } from 'vitest';
import { buildBeaconLabelViews } from '../src/game/runtime/runSceneObjectiveView';
import type { RunObjectiveVisualState } from '../src/game/runtime/runObjectiveVisuals';

function buildVisualState(): RunObjectiveVisualState {
  return {
    nodeType: 'ruin',
    beaconRule: 'ordered',
    nextBeaconIndex: 1,
    serviceStopReady: false,
    serviceStops: [],
    impactPlates: [],
    canopyLifts: [],
    syncGates: [],
    beacons: [
      {
        id: 'b0',
        x: 120,
        y: 140,
        radius: 18,
        activated: true,
        isNextRequired: false,
        steadyReady: false,
        anomalyWindowOpen: false,
        anomalyFacingAligned: false,
        anomalyScanLocked: false,
        anomalyScanProgressRatio: 0,
        labelText: '1',
        labelFill: '#000000'
      },
      {
        id: 'b1',
        x: 220,
        y: 160,
        radius: 18,
        activated: false,
        isNextRequired: true,
        steadyReady: false,
        anomalyWindowOpen: false,
        anomalyFacingAligned: false,
        anomalyScanLocked: false,
        anomalyScanProgressRatio: 0,
        labelText: '2',
        labelFill: '#92400e'
      }
    ]
  };
}

describe('runSceneObjectiveView', () => {
  it('builds label views only for visible non-standard beacons', () => {
    const visuals = buildVisualState();

    expect(buildBeaconLabelViews(visuals, 20)).toEqual([
      {
        fill: '#92400e',
        text: '2',
        x: 200,
        y: 160
      }
    ]);
  });

  it('suppresses label views for standard beacon rules', () => {
    const visuals = buildVisualState();
    visuals.beaconRule = 'standard';

    expect(buildBeaconLabelViews(visuals, 0)).toEqual([]);
  });
});
