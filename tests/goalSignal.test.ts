import { describe, expect, it } from 'vitest';
import {
  applyGoalSignalPrimer,
  GOAL_SIGNAL_PRIMER_NOTE,
  goalSignalPrimerNote,
  hasGoalSignalPrimer
} from '../src/game/runtime/goalSignal';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('goal-signal');

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
    beacons: [
      { id: 'b0', x: 0, y: 0, r: 15, activated: false },
      { id: 'b1', x: 50, y: 0, r: 15, activated: false }
    ],
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

describe('goal signal primer helpers', () => {
  it('primes the first relay when synthesis reaches the expedition goal', () => {
    const state = buildRuntimeState();
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    expect(hasGoalSignalPrimer(state)).toBe(true);
    expect(applyGoalSignalPrimer(state)).toBe(true);
    expect(state.beacons[0]?.activated).toBe(true);
    expect(state.beacons[1]?.activated).toBe(false);
  });

  it('stays inactive away from the goal or before synthesis', () => {
    const state = buildRuntimeState();

    expect(hasGoalSignalPrimer(state)).toBe(false);
    expect(applyGoalSignalPrimer(state)).toBe(false);
    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toBeNull();

    state.sim.notebook.synthesisUnlocked = true;
    expect(applyGoalSignalPrimer(state)).toBe(false);
    expect(state.beacons.every((beacon) => !beacon.activated)).toBe(true);
  });

  it('surfaces the primer note only on synthesized goal routes', () => {
    const state = buildRuntimeState();
    state.sim.notebook.synthesisUnlocked = true;

    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toBe(GOAL_SIGNAL_PRIMER_NOTE);
    expect(goalSignalPrimerNote('n1', state)).toBeNull();
  });
});
