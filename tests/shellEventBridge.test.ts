import { describe, expect, it } from 'vitest';

import { createShellEventBridge } from '../src/game/runtime/shellEventBridge';
import { connectedNeighbors } from '../src/engine/sim/world';
import { createInitialRuntimeState, groundYForCanvasHeight } from '../src/game/runtime/runtimeState';

describe('shellEventBridge', () => {
  it('tracks pressed keys and exposes step-run input snapshots', () => {
    let state = createInitialRuntimeState(720, 'bridge-run-input');
    const bridge = createShellEventBridge({
      createSeed: () => 'unused',
      getCanvasHeight: () => 720,
      getState: () => state,
      setState: (nextState) => {
        state = nextState;
      }
    });

    bridge.onKeyDown('ArrowLeft');
    bridge.onKeyDown('Space');
    bridge.onKeyDown('ShiftRight');

    expect(bridge.buildRunStepInputSnapshot()).toEqual({
      leftPressed: true,
      rightPressed: false,
      jumpPressed: true,
      dashLeftPressed: false,
      dashRightPressed: true,
      previousJumpPressed: false,
      previousDashPressed: false
    });

    bridge.updateRunStepInputResult({ previousJumpPressed: true, previousDashPressed: true });
    expect(bridge.buildRunStepInputSnapshot().previousJumpPressed).toBe(true);
    expect(bridge.buildRunStepInputSnapshot().previousDashPressed).toBe(true);

    bridge.onKeyUp('Space');
    bridge.onKeyUp('ShiftRight');

    expect(bridge.buildRunStepInputSnapshot().jumpPressed).toBe(false);
    expect(bridge.buildRunStepInputSnapshot().dashRightPressed).toBe(false);
  });

  it('derives map rotation from held Q/E keys', () => {
    let state = createInitialRuntimeState(720, 'bridge-map-rotate');
    const bridge = createShellEventBridge({
      createSeed: () => 'unused',
      getCanvasHeight: () => 720,
      getState: () => state,
      setState: (nextState) => {
        state = nextState;
      }
    });

    expect(bridge.mapRotateInput()).toBe(0);

    bridge.onKeyDown('KeyQ');
    expect(bridge.mapRotateInput()).toBe(-1);

    bridge.onKeyDown('KeyE');
    expect(bridge.mapRotateInput()).toBe(0);

    bridge.onKeyUp('KeyQ');
    expect(bridge.mapRotateInput()).toBe(1);
  });

  it('routes shell key handling and resize updates through runtime helpers', () => {
    let state = createInitialRuntimeState(720, 'bridge-shell-routing');
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

    let canvasHeight = 720;
    const bridge = createShellEventBridge({
      createSeed: () => 'bridge-new-seed',
      getCanvasHeight: () => canvasHeight,
      getState: () => state,
      setState: (nextState) => {
        state = nextState;
      }
    });

    const fullscreenResult = bridge.onKeyDown('KeyF');
    expect(fullscreenResult).toEqual({ preventDefault: true, toggleFullscreen: true });

    bridge.onKeyDown('ArrowDown');
    const firstSelection = state.mapSelectionIndex;
    bridge.onKeyDown('ArrowDown');
    expect(state.mapSelectionIndex).toBe(firstSelection);

    bridge.onKeyUp('ArrowDown');
    bridge.onKeyDown('ArrowDown');
    expect(state.mapSelectionIndex).toBe((firstSelection + 1) % connectedNeighbors(state.sim).length);

    const newRunResult = bridge.onKeyDown('KeyN');
    expect(newRunResult.preventDefault).toBe(true);
    expect(state.seed).toBe('bridge-new-seed');

    canvasHeight = 800;
    const expectedGroundY = groundYForCanvasHeight(800);
    bridge.onResize();
    expect(state.groundY).toBe(expectedGroundY);
  });

  it('does not unlock map route repeat while the opposite vertical arrow is still held', () => {
    let state = createInitialRuntimeState(720, 'bridge-map-vertical-latch');
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

    const bridge = createShellEventBridge({
      createSeed: () => 'unused',
      getCanvasHeight: () => 720,
      getState: () => state,
      setState: (nextState) => {
        state = nextState;
      }
    });

    bridge.onKeyDown('ArrowDown');
    const firstSelection = state.mapSelectionIndex;

    bridge.onKeyDown('ArrowUp');
    expect(state.mapSelectionIndex).toBe(firstSelection);

    bridge.onKeyUp('ArrowUp');
    bridge.onKeyDown('ArrowDown');
    expect(state.mapSelectionIndex).toBe(firstSelection);

    bridge.onKeyUp('ArrowDown');
    bridge.onKeyDown('ArrowDown');
    expect(state.mapSelectionIndex).toBe((firstSelection + 1) % connectedNeighbors(state.sim).length);
  });

  it('clears held inputs and latches when the shell loses focus', () => {
    let state = createInitialRuntimeState(720, 'bridge-blur-reset');
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

    const bridge = createShellEventBridge({
      createSeed: () => 'unused',
      getCanvasHeight: () => 720,
      getState: () => state,
      setState: (nextState) => {
        state = nextState;
      }
    });

    bridge.onKeyDown('ArrowLeft');
    bridge.onKeyDown('Space');
    bridge.onKeyDown('ShiftRight');
    bridge.onKeyDown('ArrowDown');
    bridge.updateRunStepInputResult({ previousJumpPressed: true, previousDashPressed: true });

    bridge.onBlur();

    expect(bridge.buildRunStepInputSnapshot()).toEqual({
      leftPressed: false,
      rightPressed: false,
      jumpPressed: false,
      dashLeftPressed: false,
      dashRightPressed: false,
      previousJumpPressed: false,
      previousDashPressed: false
    });

    const selectionAfterBlur = state.mapSelectionIndex;
    bridge.onKeyDown('ArrowDown');
    expect(state.mapSelectionIndex).toBe((selectionAfterBlur + 1) % connectedNeighbors(state.sim).length);
  });
});
