import { describe, expect, it } from 'vitest';
import {
  applyNodeCompletionState,
  buildExitLockedMessage,
  buildRunCompletionMessage
} from '../src/game/runtime/runCompletion';
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

describe('run completion copy helpers', () => {
  it('builds a compact exit-lock summary from every remaining objective type', () => {
    expect(
      buildExitLockedMessage({
        completed: 1,
        total: 6,
        beaconsRemaining: 1,
        serviceStopsRemaining: 2,
        syncGatesRemaining: 1,
        canopyLiftsRemaining: 0,
        impactPlatesRemaining: 3
      })
    ).toBe('Exit locked: 1 relay, 2 service bays, 1 sync gate, 3 impact plates left.');
  });

  it('includes flawless recovery and notebook updates for non-goal node completions', () => {
    expect(
      buildRunCompletionMessage({
        expeditionCompleted: false,
        flawlessRecovery: 1,
        latestNotebookEntryTitle: 'Relay Masonry'
      })
    ).toBe('Trail complete: route data synced. Clean run restored +1 HP and unlocked +1 free trip. Notebook updated: Relay Masonry.');
  });

  it('suppresses notebook text when no new clue was logged', () => {
    expect(
      buildRunCompletionMessage({
        expeditionCompleted: false,
        flawlessRecovery: 0
      })
    ).toBe('Trail complete: route data synced. +1 free travel charge unlocked.');
  });

  it('uses the expedition-ending celebration copy when the goal node is cleared', () => {
    expect(
      buildRunCompletionMessage({
        expeditionCompleted: true,
        expeditionEndingTitle: 'Grounded Relay Vault',
        expeditionEndingCompletionNote:
          'The source shelves its relay line low and opens a grounded vault at the end of the route.',
        expeditionEndingEpilogueNote:
          'Its grounded lattice answers the bike-scale relay language instead of abandoning it.',
        flawlessRecovery: 1,
        latestNotebookEntryTitle: 'Ignored'
      })
    ).toBe(
      'Signal source reached. Grounded Relay Vault decoded. The source shelves its relay line low and opens a grounded vault at the end of the route. Its grounded lattice answers the bike-scale relay language instead of abandoning it. Press N for a new expedition.'
    );
  });

  it('falls back to generic expedition-ending copy when no goal variant is available', () => {
    expect(
      buildRunCompletionMessage({
        expeditionCompleted: true,
        flawlessRecovery: 1,
        latestNotebookEntryTitle: 'Ignored'
      })
    ).toBe('Signal source reached. Expedition complete. Press N for a new expedition.');
  });
});
