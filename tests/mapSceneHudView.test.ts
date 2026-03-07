import { describe, expect, it } from 'vitest';
import { buildMapSceneHudViewModel } from '../src/game/runtime/mapSceneHudView';
import { MODULE_LABELS } from '../src/game/runtime/runLayout';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('map-scene-hud-view');

  return {
    mode: 'playing',
    scene: 'map',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 14,
    health: 3,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 4,
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

describe('mapSceneHudView', () => {
  it('assembles stable map hud rows, header, and module label placements', () => {
    const state = buildRuntimeState();
    state.sim.day = 7;
    state.sim.scrap = 8;
    state.sim.fuel = 9;
    state.sim.fuelCapacity = 12;
    state.sim.vehicle.storage = 4;
    state.sim.vehicleCondition.storage = 1;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.synthesisUnlocked = true;

    const view = buildMapSceneHudViewModel(state, 900, 'NODE CLEAR', MODULE_LABELS.length);

    expect(view.title).toBe(`map ${state.sim.currentNodeId}`);
    expect(view.meta).toBe('DAY 7   SCRAP 8   NODE CLEAR   NB 2/3 SYNTH');
    expect(view.seed).toBe(`SEED ${state.seed}`);
    expect(view.headerLayout).toEqual({
      metaX: 36,
      metaY: 34,
      seedX: 36,
      seedY: 46,
      titleX: 36,
      titleY: 16
    });
    expect(view.leftRows).toEqual([
      { label: 'TRIPS', value: '3', y: 79 },
      { label: 'FUEL', value: '9/12', y: 105 }
    ]);
    expect(view.rightHeaderLines).toEqual(['VEHICLE', 'LEVEL / CONDITION']);
    expect(view.freeTripFilled).toBe(3);
    expect(view.freeTripTotal).toBe(3);
    expect(view.fuelRatio).toBeCloseTo(0.75);
    expect(view.moduleLabels).toEqual([
      { text: MODULE_LABELS[0], x: 582, y: 97 },
      { text: MODULE_LABELS[1].slice(0, 5), x: 666, y: 97 },
      { text: MODULE_LABELS[2], x: 750, y: 97 },
      { text: MODULE_LABELS[3], x: 582, y: 133 },
      { text: MODULE_LABELS[4].slice(0, 5), x: 666, y: 133 },
      { text: MODULE_LABELS[5].slice(0, 5), x: 750, y: 133 }
    ]);
    expect(view.moduleMeters[4]).toMatchObject({
      subsystem: 'storage',
      x: 660,
      y: 124,
      levelRatio: 1,
      conditionRatio: 1 / 3,
      conditionColor: '#ef4444'
    });
  });
});
