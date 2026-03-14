import { describe, expect, it } from 'vitest';
import { buildRunActionChips } from '../src/game/runtime/runSceneView';
import { buildRunSceneHudViewModel } from '../src/game/runtime/runSceneHudView';
import { buildRunSceneTextAssembly } from '../src/game/runtime/runSceneTextAssembly';
import { MODULE_LABELS } from '../src/game/runtime/runLayout';
import type { SceneTextView } from '../src/game/runtime/sceneTextView';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-scene-text-assembly');

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
    runPromptText: '',
    runPromptTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    legacyCarryOvers: [],
    dashEnergy: 0.64,
    dashBoost: 0,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: 0,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    shieldChargeAvailable: false,
    beacons: [
      { id: 'b0', x: 0, y: 0, r: 18, activated: true },
      { id: 'b1', x: 0, y: 0, r: 18, activated: false },
      { id: 'b2', x: 0, y: 0, r: 18, activated: true }
    ],
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
    goalX: 900,
    groundY: 520,
    collectibles: [],
    hazards: [],
    sim
  };
}

function measureText(view: SceneTextView): { width: number; height: number } {
  const longestLine = Math.max(...view.text.split('\n').map((line) => line.length), 0);
  const lineCount = Math.max(1, view.text.split('\n').length);
  return {
    width: longestLine * 8,
    height: lineCount * 16
  };
}

describe('runSceneTextAssembly', () => {
  it('assembles run-scene hud, beacon, module, and chip text placements from measured views', () => {
    const state = buildRuntimeState();
    state.sim.scrap = 5;
    state.sim.fuel = 7;
    state.sim.fuelCapacity = 10;
    const hud = buildRunSceneHudViewModel(state, 900, MODULE_LABELS.length);
    const chips = buildRunActionChips(state, 900, 720);
    const beacons = [{ fill: '#dbeafe', text: 'LINK', x: 200, y: 160 }];

    const assembly = buildRunSceneTextAssembly({
      beaconLabels: beacons,
      chips,
      hud,
      measureText
    });

    expect(assembly.header.title).toEqual({
      fill: '#e2e8f0',
      fontSize: 18,
      text: `town ${state.sim.currentNodeId}`,
      x: 26,
      y: 16
    });
    expect(assembly.leftRowLabels[0]).toEqual({
      fill: '#94a3b8',
      text: 'HP',
      x: 26,
      y: 55
    });
    expect(assembly.leftRowValues[1]).toEqual({
      align: 'right',
      fill: '#e2e8f0',
      text: '7/10',
      x: 290,
      y: 81
    });
    expect(assembly.rightRowValues).toHaveLength(2);
    expect(assembly.rightRowValues[0]).toEqual({
      align: 'right',
      fill: '#e2e8f0',
      text: '2/3',
      x: 838,
      y: 41
    });
    expect(assembly.moduleLabels[0]).toEqual({
      fill: '#cbd5e1',
      text: MODULE_LABELS[0],
      x: 628,
      y: 117
    });
    expect(assembly.beaconLabels[0]).toEqual({
      align: 'center',
      fill: '#dbeafe',
      text: 'LINK',
      x: 184,
      y: 152
    });
    expect(assembly.chipLabels[0]).toEqual({
      align: 'center',
      fill: '#dbeafe',
      text: 'Arrows\nMove',
      x: 43,
      y: 663
    });
  });
});
