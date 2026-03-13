import { describe, expect, it } from 'vitest';

import { buildExitLockedMessage } from '../src/game/runtime/runCompletion';
import { stepRunState } from '../src/game/runtime/runStep';
import { createInitialRuntimeState } from '../src/game/runtime/runtimeState';

describe('stepRunState', () => {
  it('applies hazard damage, reset positioning, and hit feedback through the runtime helper', () => {
    const state = createInitialRuntimeState(720, 'run-step-hazard');
    const hazard = state.hazards[0];

    expect(hazard).toBeDefined();
    if (!hazard) {
      throw new Error('Expected initial hazard');
    }

    state.health = 1;
    state.player.x = hazard.x;
    state.player.y = hazard.y;

    const result = stepRunState(state, {
      dt: 1 / 60,
      screenWidth: 1280,
      leftPressed: false,
      rightPressed: false,
      jumpPressed: false,
      dashLeftPressed: false,
      dashRightPressed: false,
      previousJumpPressed: false,
      previousDashPressed: false
    });

    expect(result.previousJumpPressed).toBe(false);
    expect(result.previousDashPressed).toBe(false);
    expect(state.health).toBe(0);
    expect(state.mode).toBe('lost');
    expect(state.tookDamageThisRun).toBe(true);
    expect(state.player.onGround).toBe(true);
    expect(state.damageFeedback?.kind).toBe('health');
    expect(state.mapMessage).toContain('subsystem took field damage');
  });

  it('collects nearby scrap through the shared collectible and storage rules', () => {
    const state = createInitialRuntimeState(720, 'run-step-collect');
    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;

    state.score = 0;
    state.sim.scrap = 0;
    state.sim.vehicle.storage = 3;
    state.collectibles = [{ x: px, y: py, r: 8, collected: false }];

    stepRunState(state, {
      dt: 1 / 60,
      screenWidth: 1280,
      leftPressed: false,
      rightPressed: false,
      jumpPressed: false,
      dashLeftPressed: false,
      dashRightPressed: false,
      previousJumpPressed: false,
      previousDashPressed: false
    });

    expect(state.collectibles[0]?.collected).toBe(true);
    expect(state.score).toBe(10);
    expect(state.sim.scrap).toBe(2);
  });

  it('locks the exit until outstanding objective progress is complete', () => {
    const state = createInitialRuntimeState(720, 'run-step-exit-lock');

    state.beacons = [{ id: 'a', x: state.goalX - 20, y: state.groundY - 80, r: 24, activated: false }];
    state.serviceStops = [];
    state.syncGates = [];
    state.canopyLifts = [];
    state.impactPlates = [];
    state.player.x = state.goalX - state.player.w;
    state.player.y = state.groundY - state.player.h;

    stepRunState(state, {
      dt: 1 / 60,
      screenWidth: 1280,
      leftPressed: false,
      rightPressed: false,
      jumpPressed: false,
      dashLeftPressed: false,
      dashRightPressed: false,
      previousJumpPressed: false,
      previousDashPressed: false
    });

    expect(state.scene).toBe('run');
    expect(state.player.x).toBe(state.goalX - 64);
    expect(state.mapMessage).toBe(buildExitLockedMessage({
      completed: 0,
      total: 1,
      beaconsRemaining: 1,
      serviceStopsRemaining: 0,
      syncGatesRemaining: 0,
      canopyLiftsRemaining: 0,
      impactPlatesRemaining: 0
    }));
  });
});
