import { describe, expect, it } from 'vitest';
import { objectiveShortLabel, runObjectiveProgress, runObjectivePrompt } from '../src/game/runtime/runObjectiveUi';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-objective-ui');

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

describe('run objective ui helpers', () => {
  it('summarizes total objective progress across all interaction types', () => {
    const state = buildRuntimeState();
    state.beacons = [
      { id: 'b0', x: 0, y: 0, r: 15, activated: true },
      { id: 'b1', x: 0, y: 0, r: 15, activated: false }
    ];
    state.serviceStops = [{ id: 'svc0', x: 0, w: 100, progress: 0.7, serviced: true }];
    state.syncGates = [{ id: 'sg0', x: 0, y: 0, w: 50, h: 60, stabilized: false }];
    state.canopyLifts = [{ id: 'cl0', x: 0, y: 0, w: 60, h: 80, progress: 0.6, charted: true }];
    state.impactPlates = [{ id: 'ip0', x: 0, w: 80, shattered: false }];

    expect(runObjectiveProgress(state)).toEqual({
      completed: 3,
      total: 6,
      beaconsRemaining: 1,
      serviceStopsRemaining: 0,
      syncGatesRemaining: 1,
      canopyLiftsRemaining: 0,
      impactPlatesRemaining: 1
    });
  });

  it('prioritizes sync-gate prompts over other objective prompts', () => {
    const state = buildRuntimeState();
    state.sim.currentNodeId = 'n1';
    const anomalyNode = state.sim.world.nodes.find((node) => node.id === 'n1');
    if (!anomalyNode) throw new Error('Expected node');
    anomalyNode.type = 'anomaly';
    state.syncGates = [{ id: 'sg0', x: 17, y: 22, w: 60, h: 90, stabilized: false }];
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 260;

    expect(runObjectivePrompt(state)).toContain('Sync gate open');
  });

  it('surfaces biome-specific non-relay prompts when present', () => {
    const state = buildRuntimeState();
    const ruinNode = state.sim.world.nodes.find((node) => node.id === state.sim.currentNodeId);
    if (!ruinNode) throw new Error('Expected ruin node');
    ruinNode.type = 'ruin';
    state.impactPlates = [{ id: 'ip0', x: 17, w: 100, shattered: false }];
    state.player.x = 0;
    state.player.onGround = true;

    expect(runObjectivePrompt(state)).toContain('Impact plate intact');

    ruinNode.type = 'nature';
    state.impactPlates = [];
    state.canopyLifts = [{ id: 'cl0', x: 17, y: 22, w: 70, h: 80, progress: 0.3, charted: false }];
    state.player.onGround = false;

    expect(runObjectivePrompt(state)).toContain('Canopy draft engaged');
  });

  it('falls back to beacon prompts and exposes compact objective labels', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected node');
    node.type = 'nature';
    state.beacons = [{ id: 'b0', x: 17, y: 22, r: 15, activated: false }];
    state.player.x = 0;
    state.player.y = 0;
    state.player.onGround = false;

    expect(runObjectivePrompt(state)).toContain('Jump through it, then press Enter');
    expect(objectiveShortLabel('town')).toBe('OBJ STEADY');
    expect(objectiveShortLabel('ruin')).toBe('OBJ ORDER');
    expect(objectiveShortLabel('nature')).toBe('OBJ AIR');
    expect(objectiveShortLabel('anomaly')).toBe('OBJ BOOST');
  });

  it('surfaces anomaly phase-lock prompts for upgraded scanners', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected node');
    node.type = 'anomaly';
    state.sim.vehicle.scanner = 2;
    state.elapsedSeconds = 0.1;
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 280;
    state.dashBoost = 0.3;
    state.beacons = [{ id: 'b0', x: 17, y: 22, r: 15, activated: false, scanProgress: 0.2, scanLocked: false }];

    expect(runObjectivePrompt(state)).toContain('Hold speed to lock 50%');

    state.beacons[0]!.scanLocked = true;
    expect(runObjectivePrompt(state)).toContain('Pattern locked');
  });
});
