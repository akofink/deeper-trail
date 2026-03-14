import { describe, expect, it } from 'vitest';

import { buildExitLockedMessage } from '../src/game/runtime/runCompletion';
import { stepRunState } from '../src/game/runtime/runStep';
import { createInitialRuntimeState } from '../src/game/runtime/runtimeState';

describe('stepRunState', () => {
  it('spends noticeably less boost energy on a quick tap than on a sustained hold', () => {
    const tappedState = createInitialRuntimeState(720, 'run-step-dash-tap');
    const heldState = createInitialRuntimeState(720, 'run-step-dash-hold');

    const runFrame = (
      state: ReturnType<typeof createInitialRuntimeState>,
      dashPressed: boolean,
      previousDashPressed: boolean
    ) =>
      stepRunState(state, {
        dt: 1 / 60,
        screenWidth: 1280,
        leftPressed: false,
        rightPressed: true,
        jumpPressed: false,
        dashLeftPressed: false,
        dashRightPressed: dashPressed,
        previousJumpPressed: false,
        previousDashPressed
      });

    let tapResult = runFrame(tappedState, true, false);
    for (let frame = 0; frame < 7; frame += 1) {
      tapResult = runFrame(tappedState, false, tapResult.previousDashPressed);
    }

    let holdResult = runFrame(heldState, true, false);
    for (let frame = 0; frame < 7; frame += 1) {
      holdResult = runFrame(heldState, true, holdResult.previousDashPressed);
    }

    expect(tappedState.dashEnergy).toBeGreaterThan(0.75);
    expect(heldState.dashEnergy).toBeLessThan(0.7);
    expect(tappedState.dashEnergy - heldState.dashEnergy).toBeGreaterThan(0.18);
    expect(holdResult.previousDashPressed).toBe(true);
  });

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
