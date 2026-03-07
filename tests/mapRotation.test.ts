import { describe, expect, it } from 'vitest';
import { updateMapRotation } from '../src/game/runtime/mapRotation';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('map-rotation');

  return {
    mode: 'playing',
    scene: 'map',
    seed: sim.seed,
    expeditionGoalNodeId: 'n9',
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 1,
    dashBoost: 0,
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
    groundY: 0,
    collectibles: [],
    hazards: [],
    sim
  };
}

describe('map rotation helper', () => {
  it('accelerates rotation faster the longer the same input is held', () => {
    const state = buildRuntimeState();

    updateMapRotation(state, 1, 0.1);
    const firstVelocity = state.mapRotationVelocity;
    updateMapRotation(state, 1, 0.1);
    const secondVelocity = state.mapRotationVelocity;

    expect(firstVelocity).toBeGreaterThan(0);
    expect(secondVelocity).toBeGreaterThan(firstVelocity);
    expect(state.mapRotation).toBeGreaterThan(0);
  });

  it('slows down when input is released and supports both rotation directions', () => {
    const state = buildRuntimeState();

    updateMapRotation(state, -1, 0.1);
    const leftVelocity = state.mapRotationVelocity;
    expect(leftVelocity).toBeLessThan(0);

    updateMapRotation(state, 0, 0.1);
    expect(Math.abs(state.mapRotationVelocity)).toBeLessThan(Math.abs(leftVelocity));
  });
});
