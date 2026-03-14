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
    state.postGoalRouteHookCharges = 2;
    state.postGoalRouteHookNote = 'Afterglow hook: each post-goal route yields +2 salvage.';
    state.legacyCarryOvers = [];
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
    expect(result.nextState.legacyCarryOvers).toEqual([
      {
        type: 'salvage-echo',
        charges: 2,
        note: 'Afterglow hook: each post-goal route yields +2 salvage.',
        sourceTitle: 'Echo Salvage Orchard'
      }
    ]);
  });

  it('spends queued legacy echoes on the first outbound route after starting a fresh seeded world', () => {
    const completedState = createInitialRuntimeState(720, 'shell-legacy-chain');
    completedState.scene = 'map';
    completedState.expeditionComplete = true;
    completedState.postGoalRouteHookType = 'salvage-echo';
    completedState.postGoalRouteHookCharges = 2;
    completedState.postGoalRouteHookNote = 'Afterglow hook: each post-goal route yields +2 salvage.';
    completedState.legacyCarryOvers = [
      {
        type: 'quiet-heal',
        charges: 1,
        note: 'Legacy echo: quiet crossing restores +1 hull on the next route.',
        sourceTitle: 'Quiet Phase Garden'
      }
    ];
    completedState.sim.notebook.entries.push(
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
    completedState.sim.notebook.synthesisUnlocked = true;
    completedState.sim.currentNodeId = completedState.expeditionGoalNodeId;

    const newWorldResult = handleShellKeyDown(completedState, 'KeyN', {
      canvasHeight: 720,
      createSeed: () => 'shell-legacy-chain-next',
      previousMapNavigate: false
    });

    const nextState = newWorldResult.nextState;
    expect(nextState.legacyCarryOvers).toEqual([
      {
        type: 'quiet-heal',
        charges: 1,
        note: 'Legacy echo: quiet crossing restores +1 hull on the next route.',
        sourceTitle: 'Quiet Phase Garden'
      },
      {
        type: 'salvage-echo',
        charges: 2,
        note: 'Afterglow hook: each post-goal route yields +2 salvage.',
        sourceTitle: 'Echo Salvage Orchard'
      }
    ]);

    nextState.scene = 'map';
    nextState.health = 2;
    nextState.sim.scrap = 0;
    nextState.completedNodeIds.push(nextState.sim.currentNodeId);

    const neighbor = connectedNeighbors(nextState.sim)[0];
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected connected neighbor');
    }

    const destination = findNode(nextState.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected destination node');
    }
    destination.type = 'town';

    const travelResult = handleShellKeyDown(nextState, 'Enter', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: false
    });

    expect(travelResult.nextState.scene).toBe('run');
    expect(travelResult.nextState.legacyCarryOvers).toEqual([]);
    expect(travelResult.nextState.health).toBe(3);
    expect(travelResult.nextState.sim.scrap).toBe(4);
    expect(travelResult.nextState.mapMessage).toContain('Arrived at town: fuel topped up +8.');
    expect(travelResult.nextState.mapMessage).toContain(
      'Legacy echoes Quiet Phase Garden: quiet crossing restores +1 hull. Echo Salvage Orchard: salvage echo recovered +4 scrap.'
    );
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

  it('keeps the route-nav latch armed while another vertical arrow remains held', () => {
    const heldOppositeArrow = handleShellKeyUp('ArrowUp', true, {
      hasHeldMapNavigationKey: true
    });
    expect(heldOppositeArrow.previousMapNavigate).toBe(true);

    const fullyReleased = handleShellKeyUp('ArrowDown', heldOppositeArrow.previousMapNavigate, {
      hasHeldMapNavigationKey: false
    });
    expect(fullyReleased.previousMapNavigate).toBe(false);
  });

  it('cycles site install offers with left and right on the map without using the route-nav latch', () => {
    const state = createInitialRuntimeState(720, 'shell-map-install-nav');
    state.scene = 'map';

    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }
    currentNode.type = 'town';

    const nextOffer = handleShellKeyDown(state, 'ArrowRight', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: false
    });
    expect(state.mapInstallSelectionIndex).toBe(1);
    expect(nextOffer.previousMapNavigate).toBe(false);

    handleShellKeyDown(state, 'ArrowLeft', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: false
    });
    expect(state.mapInstallSelectionIndex).toBe(0);
  });

  it('normalizes stale route and install selections when opening the map scene', () => {
    const state = createInitialRuntimeState(720, 'shell-map-normalize');
    state.scene = 'run';
    state.mapSelectionIndex = 99;
    state.mapInstallSelectionIndex = 99;

    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }
    currentNode.type = 'anomaly';

    const result = handleShellKeyDown(state, 'KeyA', {
      canvasHeight: 720,
      createSeed: () => 'unused',
      previousMapNavigate: false
    });

    expect(result.nextState.scene).toBe('map');
    expect(result.nextState.mapSelectionIndex).toBe(connectedNeighbors(state.sim).length - 1);
    expect(result.nextState.mapInstallSelectionIndex).toBe(1);
    expect(result.nextState.mapMessage).toBe('Choose a connected route and press Enter to travel.');
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
