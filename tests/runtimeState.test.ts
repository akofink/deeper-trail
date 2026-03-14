import { describe, expect, it } from 'vitest';

import { currentNodeType, findNode } from '../src/engine/sim/world';
import { buildRunLayout } from '../src/game/runtime/runLayout';
import {
  canUseMedPatch,
  COYOTE_TIME,
  createInitialRuntimeState,
  groundYForCanvasHeight,
  MEDPATCH_HEAL_AMOUNT,
  MEDPATCH_SCRAP_COST,
  PLAYER_H,
  PLAYER_W,
  resetRunFromCurrentNode,
  shiftRunSceneVertical,
  START_X,
  tryUseMedPatch
} from '../src/game/runtime/runtimeState';

describe('runtimeState helpers', () => {
  it('creates the initial runtime state from the deterministic sim seed and canvas height', () => {
    const state = createInitialRuntimeState(800, 'runtime-seed');
    const expectedGroundY = groundYForCanvasHeight(800);
    const expectedRun = buildRunLayout(expectedGroundY, currentNodeType(state.sim));

    expect(state.seed).toBe('runtime-seed');
    expect(state.scene).toBe('run');
    expect(state.mode).toBe('playing');
    expect(state.groundY).toBe(expectedGroundY);
    expect(state.player).toMatchObject({
      x: START_X,
      y: expectedGroundY - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      onGround: true,
      coyoteTime: COYOTE_TIME
    });
    expect(state.goalX).toBe(expectedRun.goalX);
    expect(state.collectibles).toEqual(expectedRun.collectibles);
    expect(state.hazards).toEqual(expectedRun.hazards);
    expect(state.beacons).toEqual(expectedRun.beacons);
    expect(state.sim.seed).toBe('runtime-seed');
  });

  it('stores a pending legacy carry-over when a new expedition starts from a finished one', () => {
    const state = createInitialRuntimeState(720, 'runtime-legacy', {
      type: 'salvage-echo',
      note: 'Legacy echo: salvage echo recovered +2 scrap on the next route.',
      sourceTitle: 'Echo Salvage Orchard'
    });

    expect(state.legacyCarryOverType).toBe('salvage-echo');
    expect(state.legacyCarryOverNote).toContain('salvage echo');
    expect(state.legacyCarryOverSourceTitle).toBe('Echo Salvage Orchard');
    expect(state.expeditionComplete).toBe(false);
  });

  it('requires damage and enough scrap before a med patch can be used', () => {
    const state = createInitialRuntimeState(720, 'med-patch-preconditions');

    state.sim.scrap = MEDPATCH_SCRAP_COST;
    expect(canUseMedPatch(state)).toBe(false);
    expect(tryUseMedPatch(state)).toEqual({
      didHeal: false,
      reason: 'Hull integrity already at max HP'
    });

    state.health -= 1;
    state.sim.scrap = MEDPATCH_SCRAP_COST - 1;
    expect(canUseMedPatch(state)).toBe(false);
    expect(tryUseMedPatch(state)).toEqual({
      didHeal: false,
      reason: `Need ${MEDPATCH_SCRAP_COST} scrap for a med patch`
    });
  });

  it('spends scrap and heals up to the runtime max health', () => {
    const state = createInitialRuntimeState(720, 'med-patch-heal');

    state.health -= MEDPATCH_HEAL_AMOUNT;
    state.sim.scrap = MEDPATCH_SCRAP_COST + 1;

    expect(canUseMedPatch(state)).toBe(true);
    expect(tryUseMedPatch(state)).toEqual({ didHeal: true });
    expect(state.health).toBe(3);
    expect(state.sim.scrap).toBe(1);
  });

  it('resets the run state and rebuilds biome-specific layout from the current node', () => {
    const state = createInitialRuntimeState(760, 'runtime-reset');
    const currentNode = findNode(state.sim, state.sim.currentNodeId);

    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }

    currentNode.type = 'nature';
    state.expeditionGoalNodeId = 'different-node';
    state.mode = 'lost';
    state.player.x = 420;
    state.player.y = 240;
    state.player.vx = 12;
    state.player.vy = -18;
    state.player.onGround = false;
    state.player.invuln = 0.3;
    state.cameraX = 220;
    state.dashEnergy = 0.2;
    state.dashBoost = 0.7;
    state.wheelRotation = 2.4;
    state.tookDamageThisRun = true;
    state.shieldChargeAvailable = false;
    state.runPromptText = 'stale';
    state.runPromptTimer = 3;
    state.damageFeedback = { kind: 'health', timer: 0.3, duration: 0.5, worldX: 10, worldY: 20, direction: 1 };
    state.collectibles = [];
    state.hazards = [];
    state.beacons = [];
    state.serviceStops = [];
    state.syncGates = [];
    state.canopyLifts = [];
    state.impactPlates = [];
    state.sim.vehicle.shielding = 2;

    resetRunFromCurrentNode(state);

    expect(state.mode).toBe('playing');
    expect(state.player.x).toBe(START_X);
    expect(state.player.y).toBe(state.groundY - state.player.h);
    expect(state.player.vx).toBe(0);
    expect(state.player.vy).toBe(0);
    expect(state.player.onGround).toBe(true);
    expect(state.player.invuln).toBe(0);
    expect(state.cameraX).toBe(0);
    expect(state.dashEnergy).toBe(1);
    expect(state.dashBoost).toBe(0);
    expect(state.wheelRotation).toBe(0);
    expect(state.tookDamageThisRun).toBe(false);
    expect(state.shieldChargeAvailable).toBe(true);
    expect(state.runPromptText).toBe('');
    expect(state.runPromptTimer).toBe(0);
    expect(state.damageFeedback).toBeUndefined();
    expect(state.beacons.every((beacon) => !beacon.activated)).toBe(true);
    expect(state.serviceStops).toHaveLength(0);
    expect(state.syncGates).toHaveLength(0);
    expect(state.canopyLifts.length).toBeGreaterThan(0);
    expect(state.impactPlates).toHaveLength(0);
  });

  it('shifts vertically tracked run objects when the ground plane moves', () => {
    const state = createInitialRuntimeState(720, 'runtime-shift');
    const currentNode = findNode(state.sim, state.sim.currentNodeId);

    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }

    currentNode.type = 'nature';
    resetRunFromCurrentNode(state);

    const firstHazard = state.hazards[0];
    const firstCollectible = state.collectibles[0];
    const firstBeacon = state.beacons[0];
    const firstLift = state.canopyLifts[0];

    expect(firstHazard).toBeDefined();
    expect(firstCollectible).toBeDefined();
    expect(firstBeacon).toBeDefined();
    expect(firstLift).toBeDefined();
    if (!firstHazard || !firstCollectible || !firstBeacon || !firstLift) {
      throw new Error('Expected nature run objects');
    }

    shiftRunSceneVertical(state, 24);

    expect(state.player.y).toBe(state.groundY - PLAYER_H + 24);
    expect(firstHazard.y).toBe(firstHazard.baseY);
    expect(firstHazard.baseY).toBe(buildRunLayout(state.groundY, 'nature').hazards[0]?.baseY! + 24);
    expect(firstCollectible.y).toBe(buildRunLayout(state.groundY, 'nature').collectibles[0]?.y! + 24);
    expect(firstBeacon.y).toBe(buildRunLayout(state.groundY, 'nature').beacons[0]?.y! + 24);
    expect(firstLift.y).toBe(buildRunLayout(state.groundY, 'nature').canopyLifts[0]?.y! + 24);
  });
});
