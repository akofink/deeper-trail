import { describe, expect, it } from 'vitest';

import { connectedNeighbors, findNode } from '../src/engine/sim/world';
import { handleShellKeyDown, handleShellKeyUp, resizeRuntimeState } from '../src/game/runtime/shellControl';
import {
  createInitialRuntimeState,
  groundYForCanvasHeight,
  PLAYER_H,
  START_X
} from '../src/game/runtime/runtimeState';

describe('shellControl helpers', () => {
  it('toggles fullscreen as a shell effect without replacing runtime state', () => {
    const state = createInitialRuntimeState(720, 'shell-fullscreen');

    const result = handleShellKeyDown(state, 'KeyF', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: false
    });

    expect(result.nextState).toBe(state);
    expect(result.toggleFullscreen).toBe(true);
    expect(result.preventDefault).toBe(true);
  });

  it('starts a fresh seeded world from the map scene and clears held map navigation state', () => {
    const state = createInitialRuntimeState(720, 'shell-old-seed');
    state.scene = 'map';
    state.mapSelectionIndex = 2;

    const result = handleShellKeyDown(state, 'KeyN', {
      canvasHeight: 680,
      createSeed: () => 'shell-new-seed',
      previousMapNavigate: true
    });

    expect(result.nextState).not.toBe(state);
    expect(result.nextState.seed).toBe('shell-new-seed');
    expect(result.nextState.scene).toBe('run');
    expect(result.nextState.groundY).toBe(groundYForCanvasHeight(680));
    expect(result.previousMapNavigate).toBe(false);
  });

  it('carries the completed expedition aftermath into the next seeded world as a pending legacy echo', () => {
    const state = createInitialRuntimeState(720, 'shell-legacy-source');
    state.scene = 'map';
    state.expeditionComplete = true;
    state.postGoalRouteHookType = 'salvage-echo';
    state.postGoalRouteHookNote = 'Afterglow hook: each post-goal route yields +2 salvage.';
    state.legacyCarryOverType = null;
    state.sim.notebook.entries.push(
      {
        id: 'clue-nature',
        clueKey: 'nature',
        sourceNodeType: 'nature',
        sourceNodeId: 'n1',
        dayDiscovered: 1,
        title: 'Nature',
        body: 'Nature'
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
        id: 'clue-anomaly',
        clueKey: 'anomaly',
        sourceNodeType: 'anomaly',
        sourceNodeId: 'n3',
        dayDiscovered: 3,
        title: 'Anomaly',
        body: 'Anomaly'
      }
    );
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    const result = handleShellKeyDown(state, 'KeyN', {
      canvasHeight: 720,
      createSeed: () => 'shell-legacy-next',
      previousMapNavigate: false
    });

    expect(result.nextState.seed).toBe('shell-legacy-next');
    expect(result.nextState.legacyCarryOverType).toBe('salvage-echo');
    expect(result.nextState.legacyCarryOverNote).toContain('post-goal route yields +2 salvage');
    expect(result.nextState.legacyCarryOverSourceTitle).toBe('Echo Salvage Orchard');
  });

  it('restarts lost runs with a fresh state and resets won runs in place', () => {
    const lostState = createInitialRuntimeState(720, 'shell-lost');
    lostState.mode = 'lost';
    lostState.player.x = 320;

    const lostResult = handleShellKeyDown(lostState, 'Enter', {
      canvasHeight: 700,
      createSeed: () => 'shell-retry',
      previousMapNavigate: true
    });

    expect(lostResult.nextState).not.toBe(lostState);
    expect(lostResult.nextState.seed).toBe('shell-retry');
    expect(lostResult.nextState.mode).toBe('playing');
    expect(lostResult.nextState.player.x).toBe(START_X);
    expect(lostResult.previousMapNavigate).toBe(false);

    const wonState = createInitialRuntimeState(720, 'shell-won');
    const currentNode = findNode(wonState.sim, wonState.sim.currentNodeId);
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }

    currentNode.type = 'nature';
    wonState.mode = 'won';
    wonState.player.x = 420;
    wonState.player.vx = 14;
    wonState.collectibles = [];

    const wonResult = handleShellKeyDown(wonState, 'KeyR', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: true
    });

    expect(wonResult.nextState).toBe(wonState);
    expect(wonState.mode).toBe('playing');
    expect(wonState.player.x).toBe(START_X);
    expect(wonState.player.vx).toBe(0);
    expect(wonState.collectibles.length).toBeGreaterThan(0);
    expect(wonResult.previousMapNavigate).toBe(false);
  });

  it('advances map selection only once per held arrow press until keyup releases the latch', () => {
    const state = createInitialRuntimeState(720, 'shell-map-nav');
    state.scene = 'map';
    state.completedNodeIds.push(state.sim.currentNodeId);

    const branchingNode = state.sim.world.nodes.find((node) => {
      state.sim.currentNodeId = node.id;
      return connectedNeighbors(state.sim).length > 1;
    });
    expect(branchingNode).toBeDefined();
    if (!branchingNode) {
      throw new Error('Expected branching node');
    }

    state.sim.currentNodeId = branchingNode.id;
    const options = connectedNeighbors(state.sim);
    expect(options.length).toBeGreaterThan(1);

    const first = handleShellKeyDown(state, 'ArrowDown', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: false
    });
    expect(state.mapSelectionIndex).toBe(1);
    expect(first.previousMapNavigate).toBe(true);

    const held = handleShellKeyDown(state, 'ArrowDown', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: first.previousMapNavigate
    });
    expect(state.mapSelectionIndex).toBe(1);
    expect(held.previousMapNavigate).toBe(true);

    const released = handleShellKeyUp('ArrowDown', held.previousMapNavigate);
    expect(released.previousMapNavigate).toBe(false);

    handleShellKeyDown(state, 'ArrowDown', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: released.previousMapNavigate
    });
    expect(state.mapSelectionIndex).toBe(2);
  });

  it('reflows run and map scenes against the new ground line during resize', () => {
    const runState = createInitialRuntimeState(720, 'shell-resize-run');
    const runHazard = runState.hazards[0];
    expect(runHazard).toBeDefined();
    if (!runHazard) {
      throw new Error('Expected run hazard');
    }

    runState.player.y = runState.groundY - PLAYER_H - 18;
    const runHazardY = runHazard.y;

    resizeRuntimeState(runState, 800);

    expect(runState.groundY).toBe(groundYForCanvasHeight(800));
    expect(runState.player.y).toBe(groundYForCanvasHeight(800) - PLAYER_H - 18);
    expect(runHazard.y).toBe(runHazardY + (groundYForCanvasHeight(800) - groundYForCanvasHeight(720)));

    const mapState = createInitialRuntimeState(720, 'shell-resize-map');
    mapState.scene = 'map';
    mapState.player.y = mapState.groundY + 20;
    mapState.player.vy = 12;
    mapState.player.onGround = false;

    resizeRuntimeState(mapState, 680);

    expect(mapState.groundY).toBe(groundYForCanvasHeight(680));
    expect(mapState.player.y).toBe(mapState.groundY - PLAYER_H);
    expect(mapState.player.vy).toBe(0);
    expect(mapState.player.onGround).toBe(true);
  });
});
