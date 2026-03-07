import { describe, expect, it } from 'vitest';
import {
  applyGoalSignalPrimer,
  applyGoalSignalRunBonus,
  goalSignalProfile,
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
    state.sim.notebook.entries.push({
      id: 'clue-ruin',
      clueKey: 'ruin',
      sourceNodeType: 'ruin',
      sourceNodeId: 'n1',
      dayDiscovered: 1,
      title: 'Ruin',
      body: 'Ruin'
    });
    state.sim.notebook.entries.push({
      id: 'clue-anomaly',
      clueKey: 'anomaly',
      sourceNodeType: 'anomaly',
      sourceNodeId: 'n2',
      dayDiscovered: 2,
      title: 'Anomaly',
      body: 'Anomaly'
    });
    state.sim.notebook.entries.push({
      id: 'clue-nature',
      clueKey: 'nature',
      sourceNodeType: 'nature',
      sourceNodeId: 'n3',
      dayDiscovered: 3,
      title: 'Nature',
      body: 'Nature'
    });
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    expect(hasGoalSignalPrimer(state)).toBe(true);
    expect(goalSignalProfile(state)?.primerBeaconId).toBe('B0');
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
    state.sim.notebook.entries.push({
      id: 'clue-nature',
      clueKey: 'nature',
      sourceNodeType: 'nature',
      sourceNodeId: 'n1',
      dayDiscovered: 1,
      title: 'Nature',
      body: 'Nature'
    });
    state.sim.notebook.entries.push({
      id: 'clue-ruin',
      clueKey: 'ruin',
      sourceNodeType: 'ruin',
      sourceNodeId: 'n2',
      dayDiscovered: 2,
      title: 'Ruin',
      body: 'Ruin'
    });
    state.sim.notebook.entries.push({
      id: 'clue-anomaly',
      clueKey: 'anomaly',
      sourceNodeType: 'anomaly',
      sourceNodeId: 'n3',
      dayDiscovered: 3,
      title: 'Anomaly',
      body: 'Anomaly'
    });
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain('B1 pre-linked');
    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain('source cache: +2 scrap on arrival');
    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain('anomaly line: shield charge starts primed');
    expect(goalSignalPrimerNote('n1', state)).toBeNull();
  });

  it('applies a run bonus from the final clue in the synthesis sequence', () => {
    const state = buildRuntimeState();
    state.sim.notebook.entries.push({
      id: 'clue-anomaly',
      clueKey: 'anomaly',
      sourceNodeType: 'anomaly',
      sourceNodeId: 'n1',
      dayDiscovered: 1,
      title: 'Anomaly',
      body: 'Anomaly'
    });
    state.sim.notebook.entries.push({
      id: 'clue-nature',
      clueKey: 'nature',
      sourceNodeType: 'nature',
      sourceNodeId: 'n2',
      dayDiscovered: 2,
      title: 'Nature',
      body: 'Nature'
    });
    state.sim.notebook.entries.push({
      id: 'clue-ruin',
      clueKey: 'ruin',
      sourceNodeType: 'ruin',
      sourceNodeId: 'n3',
      dayDiscovered: 3,
      title: 'Ruin',
      body: 'Ruin'
    });
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;
    state.hazards = [{ kind: 'moving', x: 0, baseX: 0, y: 0, w: 60, h: 16, amplitude: 20, speed: 1, phase: 0 }];

    expect(applyGoalSignalRunBonus(state)).toBe(true);
    expect(state.hazards[0]?.w).toBe(0);
    expect(state.hazards[0]?.speed).toBe(0);
  });
});
