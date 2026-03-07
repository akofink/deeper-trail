import { describe, expect, it } from 'vitest';
import { collectibleMagnetRadius, collectibleMagnetSpeed, scrapGainPerCollectible } from '../src/game/runtime/vehicleDerivedStats';
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
    dashEnergy: 1,
    dashBoost: 0,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: 0,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    beacons: [],
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
