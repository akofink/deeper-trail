import { describe, expect, it } from 'vitest';
import {
  applyGoalSignalEncounterBonus,
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
      { id: 'b1', x: 50, y: 0, r: 15, activated: false },
      { id: 'b2', x: 100, y: 0, r: 15, activated: false }
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

function synthesizeGoalState(sequence: Array<'ruin' | 'nature' | 'anomaly'>): RuntimeState {
  const state = buildRuntimeState();

  state.sim.notebook.entries.push(
    ...sequence.map((clueKey, index) => ({
      id: `clue-${clueKey}`,
      clueKey,
      sourceNodeType: clueKey,
      sourceNodeId: `n${index + 1}`,
      dayDiscovered: index + 1,
      title: clueKey,
      body: clueKey
    }))
  );
  state.sim.notebook.synthesisUnlocked = true;
  state.sim.currentNodeId = state.expeditionGoalNodeId;

  return state;
}

describe('goal signal primer helpers', () => {
  it('primes the first relay when synthesis reaches the expedition goal', () => {
    const state = synthesizeGoalState(['ruin', 'anomaly', 'nature']);

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
    const state = synthesizeGoalState(['nature', 'ruin', 'anomaly']);

    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain('B1 pre-linked');
    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain('source cache: +2 scrap on arrival');
    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain('grove/quarry braid');
    expect(goalSignalPrimerNote(state.expeditionGoalNodeId, state)).toContain(
      'anomaly line: shield charge starts primed and one site objective starts stabilized'
    );
    expect(goalSignalPrimerNote('n1', state)).toBeNull();
  });

  it('applies a run bonus from the final clue in the synthesis sequence', () => {
    const state = synthesizeGoalState(['anomaly', 'nature', 'ruin']);
    state.hazards = [
      {
        kind: 'sweeper',
        x: 0,
        baseX: 0,
        y: 0,
        baseY: 0,
        w: 60,
        baseW: 60,
        h: 16,
        baseH: 16,
        amplitudeX: 20,
        amplitudeY: 0,
        pulse: 0,
        speed: 1,
        phase: 0
      }
    ];
    state.serviceStops = [{ id: 'svc-0', x: 40, w: 80, progress: 0, serviced: false }];

    expect(applyGoalSignalRunBonus(state)).toBe(true);
    expect(state.hazards[0]?.w).toBe(0);
    expect(state.hazards[0]?.speed).toBe(0);
    expect(state.serviceStops[0]?.serviced).toBe(true);
    expect(state.serviceStops[0]?.progress).toBeGreaterThan(0);
  });

  it('charts a secondary objective alongside the nature relay assist', () => {
    const state = synthesizeGoalState(['ruin', 'anomaly', 'nature']);
    state.canopyLifts = [{ id: 'lift-0', x: 80, y: -40, w: 40, h: 120, progress: 0, charted: false }];

    expect(applyGoalSignalRunBonus(state)).toBe(true);
    expect(state.beacons[1]?.y).toBe(20);
    expect(state.canopyLifts[0]?.charted).toBe(true);
    expect(state.canopyLifts[0]?.progress).toBeGreaterThan(0);
  });

  it('stabilizes a secondary objective alongside the anomaly shield assist', () => {
    const state = synthesizeGoalState(['ruin', 'nature', 'anomaly']);
    state.syncGates = [{ id: 'gate-0', x: 120, y: -20, w: 50, h: 50, stabilized: false }];

    expect(applyGoalSignalRunBonus(state)).toBe(true);
    expect(state.shieldChargeAvailable).toBe(true);
    expect(state.syncGates[0]?.stabilized).toBe(true);
  });

  it('adds salvage echoes for the nature-ruin source signature', () => {
    const state = synthesizeGoalState(['nature', 'ruin', 'anomaly']);

    expect(goalSignalProfile(state)?.encounterBonusType).toBe('extra-salvage');
    expect(applyGoalSignalEncounterBonus(state)).toBe(true);
    expect(state.collectibles).toHaveLength(2);
    expect(state.collectibles.map((collectible) => collectible.x)).toEqual([0, 100]);
  });

  it('quiets moving hazards for the nature-anomaly source signature', () => {
    const state = synthesizeGoalState(['nature', 'anomaly', 'ruin']);
    state.hazards = [
      {
        kind: 'sweeper',
        x: 0,
        baseX: 0,
        y: 0,
        baseY: 0,
        w: 60,
        baseW: 60,
        h: 16,
        baseH: 16,
        amplitudeX: 20,
        amplitudeY: 10,
        pulse: 12,
        speed: 2,
        phase: 0
      },
      {
        kind: 'static',
        x: 100,
        baseX: 100,
        y: 0,
        baseY: 0,
        w: 40,
        baseW: 40,
        h: 12,
        baseH: 12,
        amplitudeX: 0,
        amplitudeY: 0,
        pulse: 0,
        speed: 0,
        phase: 0
      }
    ];

    expect(goalSignalProfile(state)?.encounterBonusType).toBe('soften-movers');
    expect(applyGoalSignalEncounterBonus(state)).toBe(true);
    expect(state.hazards[0]?.amplitudeX).toBe(12);
    expect(state.hazards[0]?.amplitudeY).toBe(6);
    expect(state.hazards[0]?.pulse).toBeCloseTo(7.2);
    expect(state.hazards[0]?.speed).toBe(1.2);
    expect(state.hazards[1]).toMatchObject({
      amplitudeX: 0,
      amplitudeY: 0,
      pulse: 0,
      speed: 0
    });
  });

  it('pulls the goal approach closer for the anomaly-ruin source signature', () => {
    const state = synthesizeGoalState(['anomaly', 'ruin', 'nature']);
    state.goalX = 2450;

    expect(goalSignalProfile(state)?.encounterBonusType).toBe('shorter-run');
    expect(applyGoalSignalEncounterBonus(state)).toBe(true);
    expect(state.goalX).toBe(2270);
  });
});
