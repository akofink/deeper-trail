import { describe, expect, it } from 'vitest';
import { attemptBeaconActivation, hasBeaconAutoLink } from '../src/game/runtime/beaconActivation';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('beacon-activation');

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
    dashBoost: 0.3,
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

describe('beacon activation runtime helper', () => {
  it('reports biome rule failures for manual town links when the rider is not steady', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected node');
    node.type = 'town';
    state.beacons = [{ id: 'b0', x: 17, y: 22, r: 15, activated: false }];
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 120;

    expect(attemptBeaconActivation(state, 'manual')).toBe(false);
    expect(state.beacons[0]?.activated).toBe(false);
    expect(state.mapMessage).toContain('stabilize');
    expect(state.mapMessageTimer).toBe(2.2);
  });

  it('activates in-range beacons manually and updates progress messaging', () => {
    const state = buildRuntimeState();
    state.beacons = [
      { id: 'b0', x: 17, y: 22, r: 15, activated: false },
      { id: 'b1', x: 400, y: 22, r: 15, activated: false }
    ];
    state.player.x = 0;
    state.player.y = 0;

    expect(attemptBeaconActivation(state, 'manual')).toBe(true);
    expect(state.beacons[0]?.activated).toBe(true);
    expect(state.beacons[1]?.activated).toBe(false);
    expect(state.score).toBe(15);
    expect(state.mapMessage).toBe('Linked B0 1/2.');
    expect(state.mapMessageTimer).toBe(2.5);
  });

  it('uses the scanner auto-link path without emitting the manual no-range fallback', () => {
    const state = buildRuntimeState();
    state.sim.vehicle.scanner = 3;
    state.beacons = [{ id: 'b0', x: 17, y: 22, r: 15, activated: false }];
    state.player.x = 0;
    state.player.y = 0;

    expect(hasBeaconAutoLink(state)).toBe(true);
    expect(attemptBeaconActivation(state, 'auto')).toBe(true);
    expect(state.beacons[0]?.activated).toBe(true);
    expect(state.score).toBe(15);
    expect(state.mapMessage).toBe('Auto-linked B0 1/1.');
    expect(state.mapMessageTimer).toBe(2.5);

    state.mapMessage = '';
    state.mapMessageTimer = 0;
    expect(attemptBeaconActivation(state, 'auto')).toBe(false);
    expect(state.mapMessage).toBe('');
    expect(state.mapMessageTimer).toBe(0);
  });

  it('reports anomaly phase-alignment failures before the sync lock is confirmed', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected node');
    node.type = 'anomaly';
    state.beacons = [
      { id: 'b0', x: 300, y: 22, r: 15, activated: false },
      { id: 'b1', x: 17, y: 22, r: 15, activated: false }
    ];
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 280;
    state.player.facing = 1;
    state.dashBoost = 0.3;

    expect(attemptBeaconActivation(state, 'manual')).toBe(false);
    expect(state.beacons[1]?.activated).toBe(false);
    expect(state.mapMessage).toContain('Face LEFT');
    expect(state.mapMessageTimer).toBe(2.2);
  });
});
