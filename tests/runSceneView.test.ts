import { describe, expect, it } from 'vitest';
import { buildRunActionChips, buildRunSceneOverlayCard } from '../src/game/runtime/runSceneView';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-scene-view');

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    runPromptText: '',
    runPromptTimer: 0,
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
    goalX: 900,
    groundY: 520,
    collectibles: [],
    hazards: [],
    sim
  };
}

describe('runSceneView', () => {
  it('builds a centered outcome card for emphasized modes', () => {
    const state = buildRuntimeState();
    state.mode = 'won';

    expect(buildRunSceneOverlayCard(state, 900)).toEqual({
      align: 'center',
      fontSize: 18,
      fill: '#e2e8f0',
      maxWidth: 460,
      minWidth: 280,
      paddingX: 22,
      paddingY: 18,
      text: 'Trail complete.\nMap travel unlocked and +1 free trip earned.',
      tone: 'dark',
      x: 220,
      y: 150
    });
  });

  it('shows the decoded ending title on expedition-ending win overlays', () => {
    const state = buildRuntimeState();
    state.mode = 'won';
    state.expeditionComplete = true;
    state.sim.notebook.entries.push(
      {
        id: 'clue-anomaly',
        clueKey: 'anomaly',
        sourceNodeType: 'anomaly',
        sourceNodeId: 'n1',
        dayDiscovered: 1,
        title: 'Anomaly',
        body: 'Anomaly'
      },
      {
        id: 'clue-ruin',
        clueKey: 'ruin',
        sourceNodeType: 'ruin',
        sourceNodeId: 'n2',
        dayDiscovered: 2,
        title: 'Ruin',
        body: 'Ruin'
      },
      {
        id: 'clue-nature',
        clueKey: 'nature',
        sourceNodeType: 'nature',
        sourceNodeId: 'n3',
        dayDiscovered: 3,
        title: 'Nature',
        body: 'Nature'
      }
    );
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    expect(buildRunSceneOverlayCard(state, 900)?.text).toBe(
      'Signal source reached.\nFolded Quarry Threshold\nPast the fold, the source is packed into impossible short distance: quarry ramps, relay teeth, and sudden adjacency.'
    );
  });

  it('suppresses the overlay when there is no active prompt or banner', () => {
    const state = buildRuntimeState();

    expect(buildRunSceneOverlayCard(state, 900)).toBeNull();
  });

  it('labels transient run banners as alerts and lifts them with a pulse', () => {
    const state = buildRuntimeState();
    state.elapsedSeconds = 0.1;
    state.mapMessage = 'Linked B0 1/3.';
    state.mapMessageTimer = 2;

    expect(buildRunSceneOverlayCard(state, 900)).toEqual({
      align: 'center',
      fontSize: 22,
      fill: '#fef3c7',
      maxWidth: 460,
      minWidth: 280,
      paddingX: 22,
      paddingY: 14,
      text: 'ALERT\nLinked B0 1/3.',
      tone: 'dark',
      x: 220,
      y: 137
    });
  });

  it('shows a sticky contextual objective banner with progress', () => {
    const state = buildRuntimeState();
    const node = state.sim.world.nodes.find((item) => item.id === state.sim.currentNodeId);
    if (!node) throw new Error('Expected current node');
    node.type = 'nature';
    state.runPromptText = 'Jump through the relay, then press Enter';
    state.runPromptTimer = 0.4;
    state.beacons = [{ id: 'b0', x: 17, y: 22, r: 15, activated: false }];

    expect(buildRunSceneOverlayCard(state, 900)?.text).toBe('OBJ AIR 0/1\nJump through the relay, then press Enter');
  });

  it('switches the run interaction chip label when auto-link is installed', () => {
    const state = buildRuntimeState();

    expect(buildRunActionChips(state, 720, 720)[3]).toMatchObject({
      y: 662,
      height: 34,
      label: 'Enter\nLink',
      labelFill: '#dbeafe'
    });

    state.sim.vehicle.scanner = 3;

    expect(buildRunActionChips(state, 720, 720)[3]?.label).toBe('Scan\nAuto-link');
  });

  it('keeps the run chip row inside the screen on tighter widths', () => {
    const state = buildRuntimeState();
    const chips = buildRunActionChips(state, 430, 720);

    expect(chips[0]?.x).toBe(20);
    expect(chips[1]?.x).toBeGreaterThan(chips[0]!.x + chips[0]!.w);
    expect(chips.at(-1)!.x + chips.at(-1)!.w).toBeLessThanOrEqual(410);
  });
});
