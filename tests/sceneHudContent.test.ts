import { describe, expect, it } from 'vitest';
import { currentNodeType } from '../src/engine/sim/world';
import { MODULE_LABELS } from '../src/game/runtime/runLayout';
import { buildMapHudContent, buildRunHudContent } from '../src/game/runtime/sceneHudContent';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('scene-hud-content');

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 12,
    health: 2,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 4,
    legacyCarryOvers: [],
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

describe('sceneHudContent', () => {
  it('builds deterministic run-scene hud text and module labels', () => {
    const state = buildRuntimeState();
    state.sim.scrap = 5;
    state.sim.fuel = 7;
    state.sim.fuelCapacity = 10;
    state.beacons = [
      { id: 'b0', x: 0, y: 0, r: 18, activated: true },
      { id: 'b1', x: 0, y: 0, r: 18, activated: false },
      { id: 'b2', x: 0, y: 0, r: 18, activated: true }
    ];

    const content = buildRunHudContent(state);
    const nodeType = currentNodeType(state.sim);

    expect(content.title).toBe(`${nodeType} ${state.sim.currentNodeId}`);
    expect(content.meta).toContain('SCRAP 5');
    expect(content.meta).toContain('SCORE 12');
    expect(content.seed).toBe(`SEED ${state.seed}`);
    expect(content.leftRows).toEqual([
      { label: 'HP', value: '2/3' },
      { label: 'FUEL', value: '7/10' },
      { label: 'PACE', value: '143' }
    ]);
    expect(content.rightRows).toEqual([
      { label: 'GOALS', value: '2/3' },
      { label: 'BOOST', value: '64%' },
      { label: 'SYSTEMS', value: '' }
    ]);
    expect(content.moduleLabels).toEqual(MODULE_LABELS.map((label) => label.slice(0, 5)));
  });

  it('builds map-scene meta text with notebook state and clamped trips', () => {
    const state = buildRuntimeState();
    state.sim.day = 4;
    state.sim.scrap = 9;
    state.sim.fuel = 6;
    state.sim.fuelCapacity = 11;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.synthesisUnlocked = true;

    const content = buildMapHudContent(state, 'node clear');

    expect(content.title).toBe(`map ${state.sim.currentNodeId}`);
    expect(content.meta).toBe('DAY 4   SCRAP 9   node clear   NB 2/3 SYNTH');
    expect(content.seed).toBe(`SEED ${state.seed}`);
    expect(content.leftRows).toEqual([
      { label: 'TRIPS', value: '3' },
      { label: 'FUEL', value: '6/11' }
    ]);
    expect(content.rightHeaderLines).toEqual(['VEHICLE', 'LEVEL / CONDITION']);
    expect(content.moduleLabels).toHaveLength(6);
  });
});
