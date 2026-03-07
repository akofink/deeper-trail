import { describe, expect, it } from 'vitest';
import { MODULE_LABELS } from '../src/game/runtime/runLayout';
import { buildRunSceneHudViewModel } from '../src/game/runtime/runSceneHudView';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-scene-hud-view');

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 21,
    health: 2,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 0.64,
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
      vx: -142.6,
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

describe('runSceneHudView', () => {
  it('assembles stable hud row, header, and module label placements', () => {
    const state = buildRuntimeState();
    state.sim.scrap = 5;
    state.sim.fuel = 7;
    state.sim.fuelCapacity = 10;
    state.sim.vehicle.engine = 3;
    state.sim.vehicleCondition.engine = 2;
    state.beacons = [
      { id: 'b0', x: 0, y: 0, r: 18, activated: true },
      { id: 'b1', x: 0, y: 0, r: 18, activated: false },
      { id: 'b2', x: 0, y: 0, r: 18, activated: true }
    ];

    const view = buildRunSceneHudViewModel(state, 900, MODULE_LABELS.length);

    expect(view.title).toBe(`town ${state.sim.currentNodeId}`);
    expect(view.meta).toContain('SCRAP 5');
    expect(view.seed).toBe(`SEED ${state.seed}`);
    expect(view.headerLayout).toEqual({
      metaX: 26,
      metaY: 34,
      seedX: 26,
      seedY: 46,
      titleX: 26,
      titleY: 16
    });
    expect(view.leftRows).toEqual([
      { label: 'HP', value: '2/3', y: 63 },
      { label: 'FUEL', value: '7/10', y: 89 },
      { label: 'PACE', value: '143', y: 115 }
    ]);
    expect(view.rightRows).toEqual([
      { label: 'GOALS', value: '2/3', y: 49 },
      { label: 'BOOST', value: '64%', y: 75 },
      { label: 'SYSTEMS', value: '', y: 98 }
    ]);
    expect(view.healthTotal).toBe(3);
    expect(view.healthFilled).toBe(2);
    expect(view.paceRatio).toBeCloseTo(0.5261992619926199);
    expect(view.moduleLabels).toEqual([
      { text: MODULE_LABELS[0], x: 628, y: 117 },
      { text: MODULE_LABELS[1].slice(0, 5), x: 712, y: 117 },
      { text: MODULE_LABELS[2], x: 796, y: 117 },
      { text: MODULE_LABELS[3], x: 628, y: 153 },
      { text: MODULE_LABELS[4].slice(0, 5), x: 712, y: 153 },
      { text: MODULE_LABELS[5].slice(0, 5), x: 796, y: 153 }
    ]);
    expect(view.moduleMeters[0]).toMatchObject({
      subsystem: 'frame',
      x: 622,
      y: 108,
      levelRatio: 0.25,
      conditionRatio: 1,
      conditionColor: '#34d399'
    });
    expect(view.moduleMeters[1]).toMatchObject({
      subsystem: 'engine',
      x: 706,
      y: 108,
      levelRatio: 0.75,
      conditionRatio: 2 / 3,
      conditionColor: '#f59e0b'
    });
  });
});
