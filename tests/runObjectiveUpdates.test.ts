import { describe, expect, it } from 'vitest';
import { updateRunObjectives } from '../src/game/runtime/runObjectiveUpdates';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-objective-updates');

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
    groundY: 0,
    collectibles: [],
    hazards: [],
    sim
  };
}

describe('run objective update helper', () => {
  it('advances service bays, sync gates, canopy lifts, and impact plates in one shared helper', () => {
    const state = buildRuntimeState();
    state.serviceStops = [{ id: 'svc0', x: 17, w: 80, progress: 0.68, serviced: false }];
    state.syncGates = [{ id: 'sg0', x: 17, y: 22, w: 60, h: 90, stabilized: false }];
    state.canopyLifts = [{ id: 'cl0', x: 17, y: 22, w: 70, h: 80, progress: 0.55, charted: false }];
    state.impactPlates = [{ id: 'ip0', x: 17, w: 90, shattered: false }];
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 240;
    state.player.onGround = false;

    const airborneResult = updateRunObjectives(state, {
      dt: 0.1,
      landedThisFrame: false,
      landingSpeed: 0
    });

    expect(state.serviceStops[0]?.serviced).toBe(false);
    expect(state.syncGates[0]?.stabilized).toBe(true);
    expect(state.canopyLifts[0]?.charted).toBe(true);
    expect(airborneResult.message).toContain('Lift');
    expect(state.score).toBe(40);

    state.player.onGround = true;
    state.player.vx = 40;

    const landingResult = updateRunObjectives(state, {
      dt: 0.2,
      landedThisFrame: true,
      landingSpeed: 260
    });

    expect(state.serviceStops[0]?.serviced).toBe(true);
    expect(state.impactPlates[0]?.shattered).toBe(true);
    expect(state.score).toBe(80);
    expect(landingResult.message).toContain('Plate');
    expect(landingResult.durationSeconds).toBe(2.2);
  });

  it('returns no message when nothing completes during the frame', () => {
    const state = buildRuntimeState();

    expect(
      updateRunObjectives(state, {
        dt: 0.1,
        landedThisFrame: false,
        landingSpeed: 100
      })
    ).toEqual({
      message: null,
      durationSeconds: 0
    });
  });

  it('builds anomaly relay scanner locks deterministically for scanner upgrades', () => {
    const state = buildRuntimeState();
    const anomalyNode = state.sim.world.nodes.find((node) => node.id === state.sim.currentNodeId);
    if (!anomalyNode) throw new Error('Expected node');
    anomalyNode.type = 'anomaly';
    state.sim.vehicle.scanner = 2;
    state.beacons = [{ id: 'b0', x: 17, y: 22, r: 15, activated: false, scanProgress: 0.25, scanLocked: false }];
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 280;
    state.dashBoost = 0.3;
    state.elapsedSeconds = 0.1;

    const result = updateRunObjectives(state, {
      dt: 0.15,
      landedThisFrame: false,
      landingSpeed: 0
    });

    expect(state.beacons[0]?.scanLocked).toBe(true);
    expect(state.beacons[0]?.scanProgress).toBeCloseTo(0.4);
    expect(result.message).toContain('locked');
    expect(result.durationSeconds).toBe(1.8);
  });
});
