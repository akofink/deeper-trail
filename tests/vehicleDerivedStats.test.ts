import { describe, expect, it } from 'vitest';
import {
  canopyLiftHoldSecondsForState,
  collectibleMagnetRadius,
  collectibleMagnetSpeed,
  impactPlateMinFallSpeedForState,
  scrapGainPerCollectible,
  serviceStopHoldSecondsForState,
  syncGateMinDashBoostForState,
  syncGateMinSpeedForState
} from '../src/game/runtime/vehicleDerivedStats';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('vehicle-derived-stats');

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
    legacyCarryOvers: [],
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

describe('storage-derived collectible bonuses', () => {
  it('unlocks salvage magnetism at storage level 2', () => {
    const state = buildRuntimeState();

    expect(collectibleMagnetRadius(state)).toBe(0);
    expect(collectibleMagnetSpeed(state)).toBe(0);

    state.sim.vehicle.storage = 2;

    expect(collectibleMagnetRadius(state)).toBeGreaterThan(0);
    expect(collectibleMagnetSpeed(state)).toBeGreaterThan(0);
  });

  it('increases scrap yield at storage level 3 and above', () => {
    const state = buildRuntimeState();

    expect(scrapGainPerCollectible(state)).toBe(1);

    state.sim.vehicle.storage = 3;

    expect(scrapGainPerCollectible(state)).toBe(2);
  });
});

describe('biome objective tuning from subsystem levels', () => {
  it('reduces the steady-hold time as engine levels increase', () => {
    const state = buildRuntimeState();

    expect(serviceStopHoldSecondsForState(state)).toBe(0.7);

    state.sim.vehicle.engine = 3;

    expect(serviceStopHoldSecondsForState(state)).toBeCloseTo(0.54);
  });

  it('reduces the impact slam threshold as frame levels increase', () => {
    const state = buildRuntimeState();

    expect(impactPlateMinFallSpeedForState(state)).toBe(235);

    state.sim.vehicle.frame = 4;

    expect(impactPlateMinFallSpeedForState(state)).toBe(175);
  });

  it('reduces the canopy hold requirement as suspension levels increase', () => {
    const state = buildRuntimeState();

    expect(canopyLiftHoldSecondsForState(state)).toBe(0.6);

    state.sim.vehicle.suspension = 4;

    expect(canopyLiftHoldSecondsForState(state)).toBeCloseTo(0.42);
  });

  it('reduces sync-gate speed and boost thresholds as shielding levels increase', () => {
    const state = buildRuntimeState();

    expect(syncGateMinSpeedForState(state)).toBe(210);
    expect(syncGateMinDashBoostForState(state)).toBe(0.18);

    state.sim.vehicle.shielding = 4;

    expect(syncGateMinSpeedForState(state)).toBe(165);
    expect(syncGateMinDashBoostForState(state)).toBeCloseTo(0.09);
  });
});
