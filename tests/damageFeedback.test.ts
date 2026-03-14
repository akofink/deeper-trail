import { describe, expect, it } from 'vitest';
import { buildDamageFeedbackView, decayDamageFeedback, triggerDamageFeedback } from '../src/game/runtime/damageFeedback';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('damage-feedback');

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 0.2,
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
      x: 120,
      y: 240,
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

describe('damage feedback runtime helper', () => {
  it('builds a stronger health-hit burst with warm flash colors', () => {
    const state = buildRuntimeState();
    triggerDamageFeedback(state, 'health', 180, 260, 1);

    const view = buildDamageFeedbackView(state, 40);
    expect(view).toMatchObject({
      overlayColor: '#fb7185',
      ringColor: '#fdba74',
      avatarFlashColor: '#fff1f2',
      impactX: 140,
      impactY: 260
    });
    expect(view?.overlayAlpha).toBeGreaterThan(0.1);
    expect(view?.sparks).toHaveLength(5);
  });

  it('uses a shorter, cooler pulse when the shield absorbs the hit and clears after decay', () => {
    const state = buildRuntimeState();
    triggerDamageFeedback(state, 'shield', 220, 250, -1);

    let view = buildDamageFeedbackView(state, 20);
    expect(view).toMatchObject({
      overlayColor: '#c084fc',
      ringColor: '#e9d5ff',
      avatarFlashColor: '#f5f3ff',
      impactX: 200
    });

    decayDamageFeedback(state, 0.3);
    view = buildDamageFeedbackView(state, 20);
    expect(view).toBeNull();
    expect(state.damageFeedback).toBeUndefined();
  });
});
