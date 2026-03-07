import { describe, expect, it } from 'vitest';
import { applyNodeCompletionState } from '../src/game/runtime/runCompletion';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('seed-completion');

  return {
    mode: 'won',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: 'n9',
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 1,
    dashBoost: 0,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: 0,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    beacons: [],
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

describe('applyNodeCompletionState', () => {
  it('returns normal node completions to a travel-ready map state', () => {
    const state = buildRuntimeState();

    applyNodeCompletionState(state);

    expect(state.scene).toBe('map');
    expect(state.mode).toBe('playing');
  });

  it('keeps expedition-ending completions in a won state for the celebration view', () => {
    const state = buildRuntimeState();
    state.expeditionComplete = true;

    applyNodeCompletionState(state);

    expect(state.scene).toBe('map');
    expect(state.mode).toBe('won');
  });
});
