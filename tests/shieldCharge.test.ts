import { describe, expect, it } from 'vitest';
import { hasShieldChargeCapacity, rechargeShieldCharge, tryConsumeShieldCharge } from '../src/game/runtime/shieldCharge';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('shield-charge');

  return {
    mode: 'playing',
    scene: 'run',
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

describe('shield charge runtime rules', () => {
  it('unlocks a rechargeable shield charge at shielding level 2', () => {
    const state = buildRuntimeState();

    expect(hasShieldChargeCapacity(state)).toBe(false);

    state.sim.vehicle.shielding = 2;

    expect(hasShieldChargeCapacity(state)).toBe(true);
    rechargeShieldCharge(state);
    expect(state.shieldChargeAvailable).toBe(true);
  });

  it('consumes the charge only once per run', () => {
    const state = buildRuntimeState();
    state.sim.vehicle.shielding = 2;
    rechargeShieldCharge(state);

    expect(tryConsumeShieldCharge(state)).toBe(true);
    expect(state.shieldChargeAvailable).toBe(false);
    expect(state.tookDamageThisRun).toBe(true);
    expect(tryConsumeShieldCharge(state)).toBe(false);
  });
});
