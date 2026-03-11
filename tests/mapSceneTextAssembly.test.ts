import { describe, expect, it } from 'vitest';
import { buildMapActionChips } from '../src/game/runtime/mapBoardView';
import { buildMapSceneHudViewModel } from '../src/game/runtime/mapSceneHudView';
import { buildMapSceneTextAssembly } from '../src/game/runtime/mapSceneTextAssembly';
import { MODULE_LABELS } from '../src/game/runtime/runLayout';
import type { SceneTextView } from '../src/game/runtime/sceneTextView';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('map-scene-text-assembly');

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

function measureText(view: SceneTextView): { width: number; height: number } {
  const longestLine = Math.max(...view.text.split('\n').map((line) => line.length), 0);
  const lineCount = Math.max(1, view.text.split('\n').length);
  return {
    width: longestLine * 8,
    height: lineCount * 16
  };
}

describe('mapSceneTextAssembly', () => {
  it('assembles map-scene hud, header, module, and chip text placements from measured views', () => {
    const state = buildRuntimeState();
    state.sim.day = 7;
    state.sim.scrap = 8;
    state.sim.fuel = 9;
    state.sim.fuelCapacity = 12;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.synthesisUnlocked = true;
    const hud = buildMapSceneHudViewModel(state, 900, 'NODE CLEAR', MODULE_LABELS.length);
    const chips = buildMapActionChips(900, 640, 34, false);

    const assembly = buildMapSceneTextAssembly({
      chips,
      hud,
      measureText
    });

    expect(assembly.header.meta).toEqual({
      fill: '#cbd5e1',
      fontSize: 12,
      text: 'DAY 7   SCRAP 8   NODE CLEAR   NB 2/3 SYNTH',
      x: 36,
      y: 34
    });
    expect(assembly.leftRowLabels[0]).toEqual({
      fill: '#94a3b8',
      text: 'TRIPS',
      x: 36,
      y: 71
    });
    expect(assembly.leftRowValues[1]).toEqual({
      align: 'right',
      fill: '#e2e8f0',
      text: '9/12',
      x: 286,
      y: 97
    });
    expect(assembly.rightHeaderLines).toEqual([
      { fill: '#94a3b8', text: 'VEHICLE', x: 590, y: 46 },
      { fill: '#94a3b8', text: 'LEVEL / CONDITION', x: 590, y: 60 }
    ]);
    expect(assembly.moduleLabels[5]).toEqual({
      fill: '#cbd5e1',
      text: MODULE_LABELS[5].slice(0, 5),
      x: 750,
      y: 133
    });
    expect(assembly.chipLabels[0]).toEqual({
      align: 'center',
      fill: '#64748b',
      text: 'Up/Down\nRoute',
      x: 177,
      y: 641
    });
  });
});
