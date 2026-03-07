import { describe, expect, it } from 'vitest';
import { buildRunObjectiveVisualState } from '../src/game/runtime/runObjectiveVisuals';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-objective-visuals');

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: 'n9',
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 0.1,
    mapMessage: '',
    mapMessageTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 1,
    dashBoost: 0.25,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: 0,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    shieldChargeAvailable: false,
    beacons: [],
    serviceStops: [],
    syncGates: [],
    canopyLifts: [],
    impactPlates: [],
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: 34,
      h: 44,
      onGround: true,
      invuln: 0,
      coyoteTime: 0,
      jumpBufferTime: 0,
      facing: 1
    },
    cameraX: 0,
    goalX: 0,
    groundY: 300,
    collectibles: [],
    hazards: [],
    sim
  };
}

describe('run objective visuals helper', () => {
  it('computes steady and ordered beacon emphasis plus objective visual ratios', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected node');

    node.type = 'town';
    state.player.vx = 40;
    state.player.onGround = true;
    state.serviceStops = [{ id: 'svc0', x: 100, w: 120, progress: 0.35, serviced: false }];
    state.beacons = [{ id: 'b0', x: 0, y: 0, r: 15, activated: false }];

    let visuals = buildRunObjectiveVisualState(state);
    expect(visuals.serviceStopReady).toBe(true);
    expect(visuals.serviceStops[0]?.progressRatio).toBeCloseTo(0.5);
    expect(visuals.beacons[0]?.steadyReady).toBe(true);
    expect(visuals.beacons[0]?.labelText).toBe('S');

    node.type = 'ruin';
    state.beacons = [
      { id: 'b0', x: 0, y: 0, r: 15, activated: true },
      { id: 'b1', x: 0, y: 0, r: 15, activated: false }
    ];
    state.impactPlates = [{ id: 'ip0', x: 200, w: 100, shattered: false }];

    visuals = buildRunObjectiveVisualState(state);
    expect(visuals.nextBeaconIndex).toBe(1);
    expect(visuals.beacons[1]?.isNextRequired).toBe(true);
    expect(visuals.impactPlates[0]?.shattered).toBe(false);
  });

  it('computes anomaly windows and canopy lift pulse state from elapsed time', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected node');

    node.type = 'anomaly';
    state.syncGates = [{ id: 'sg0', x: 120, y: 140, w: 60, h: 90, stabilized: false }];
    state.beacons = [{ id: 'b0', x: 0, y: 0, r: 15, activated: false }];

    let visuals = buildRunObjectiveVisualState(state);
    expect(visuals.syncGates[0]?.phaseOpen).toBe(true);
    expect(visuals.beacons[0]?.anomalyWindowOpen).toBe(true);

    node.type = 'nature';
    state.canopyLifts = [{ id: 'cl0', x: 180, y: 160, w: 80, h: 100, progress: 0.3, charted: false }];
    visuals = buildRunObjectiveVisualState(state);
    expect(visuals.canopyLifts[0]?.progressRatio).toBeCloseTo(0.5);
    expect(visuals.canopyLifts[0]?.pulseRadius).toBeGreaterThan(0);
  });
});
