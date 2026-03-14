import { describe, expect, it } from 'vitest';

import { connectedNeighbors, findNode } from '../src/engine/sim/world';
import { FIELD_REPAIR_SCRAP_COST, getInstallOffers } from '../src/engine/sim/vehicle';
import {
  advanceMapInstallSelection,
  advanceMapSelection,
  buildMapScannerFlags,
  mapSceneStatusText,
  normalizeMapInstallSelectionIndex,
  normalizeMapSelectionIndex,
  stepMapScene,
  tryFieldRepairOnMap,
  tryInstallUpgradeOnMap,
  tryTravelSelectedNode
} from '../src/game/runtime/mapSceneFlow';
import {
  createInitialRuntimeState,
  MEDPATCH_HEAL_AMOUNT,
  MEDPATCH_SCRAP_COST,
  resetRunFromCurrentNode
} from '../src/game/runtime/runtimeState';

describe('map scene flow helpers', () => {
  it('wraps map selection and resets to zero when no routes exist', () => {
    expect(advanceMapSelection(0, 0, 1)).toBe(0);
    expect(advanceMapSelection(0, 3, -1)).toBe(2);
    expect(advanceMapSelection(2, 3, 1)).toBe(0);
    expect(advanceMapInstallSelection(0, 0, 1)).toBe(0);
    expect(advanceMapInstallSelection(0, 2, -1)).toBe(1);
  });

  it('travels to the selected route, resets the run, and switches back to the run scene', () => {
    const state = createInitialRuntimeState(720, 'map-scene-travel');
    state.scene = 'map';
    state.player.x = 420;
    state.player.vx = 11;

    const completion = findNode(state.sim, state.sim.currentNodeId);
    expect(completion).toBeDefined();
    if (!completion) {
      throw new Error('Expected current node');
    }
    completion.type = 'town';
    state.completedNodeIds.push(state.sim.currentNodeId);

    const options = connectedNeighbors(state.sim);
    expect(options.length).toBeGreaterThan(0);
    state.mapSelectionIndex = 0;

    tryTravelSelectedNode(state);

    expect(state.scene).toBe('run');
    expect(state.mode).toBe('playing');
    expect(state.player.x).not.toBe(420);
    expect(state.player.vx).toBe(0);
    expect(state.sim.currentNodeId).toBe(options[0]?.nodeId);
    expect(state.mapSelectionIndex).toBe(0);
    expect(state.mapInstallSelectionIndex).toBe(0);
  });

  it('blocks travel until the current node run has been completed', () => {
    const state = createInitialRuntimeState(720, 'map-scene-block-travel');
    state.scene = 'map';

    tryTravelSelectedNode(state);

    expect(state.scene).toBe('map');
    expect(state.mapMessage).toBe('Complete this node run first to unlock outbound travel.');
    expect(state.mapMessageTimer).toBe(3);
  });

  it('blocks post-goal travel when no aftermath hooks remain', () => {
    const state = createInitialRuntimeState(720, 'map-scene-post-goal-block');
    state.scene = 'map';
    state.expeditionComplete = true;
    state.postGoalRouteHookCharges = 0;

    tryTravelSelectedNode(state);

    expect(state.scene).toBe('map');
    expect(state.mapMessage).toBe('Expedition complete. Press N for a new world.');
    expect(state.mapMessageTimer).toBe(3);
  });

  it('allows post-goal travel with remaining aftermath hooks and consumes one charge', () => {
    const state = createInitialRuntimeState(720, 'map-scene-post-goal-travel');
    state.scene = 'map';
    state.expeditionComplete = true;
    state.postGoalRouteHookType = 'salvage-echo';
    state.postGoalRouteHookCharges = 2;
    state.postGoalRouteHookNote = 'Afterglow hook: each post-goal route yields +2 salvage.';
    state.sim.scrap = 0;

    const options = connectedNeighbors(state.sim);
    expect(options.length).toBeGreaterThan(0);

    tryTravelSelectedNode(state);

    expect(state.scene).toBe('run');
    expect(state.sim.currentNodeId).toBe(options[0]?.nodeId);
    expect(state.postGoalRouteHookCharges).toBe(1);
    expect(state.sim.scrap).toBeGreaterThanOrEqual(2);
  });

  it('consumes a pending legacy echo on the first new-expedition travel after arrival rewards', () => {
    const state = createInitialRuntimeState(720, 'map-scene-legacy-travel', [
      {
        type: 'quiet-heal',
        note: 'Legacy echo: quiet crossing restores +1 hull on the next route.',
        sourceTitle: 'Quiet Phase Garden'
      }
    ]);
    state.scene = 'map';
    state.health = 2;

    const completion = findNode(state.sim, state.sim.currentNodeId);
    expect(completion).toBeDefined();
    if (!completion) {
      throw new Error('Expected current node');
    }
    completion.type = 'town';
    state.completedNodeIds.push(state.sim.currentNodeId);

    const options = connectedNeighbors(state.sim);
    expect(options.length).toBeGreaterThan(0);

    tryTravelSelectedNode(state);

    expect(state.scene).toBe('run');
    expect(state.health).toBe(3);
    expect(state.mapMessage).toContain('Legacy echoes Quiet Phase Garden: quiet crossing restores +1 hull.');
    expect(state.legacyCarryOvers).toEqual([]);
  });

  it('repairs damaged subsystems and falls back to a med patch when the vehicle is already repaired', () => {
    const state = createInitialRuntimeState(720, 'map-scene-repair');
    state.scene = 'map';
    state.sim.scrap = FIELD_REPAIR_SCRAP_COST + MEDPATCH_SCRAP_COST + 1;
    state.sim.vehicleCondition.engine = 1;

    tryFieldRepairOnMap(state);

    expect(state.sim.vehicleCondition.engine).toBe(2);
    expect(state.mapMessage).toContain('engine restored to 2/3');
    expect(state.mapMessageTimer).toBe(3);

    state.health -= MEDPATCH_HEAL_AMOUNT;
    state.sim.vehicleCondition.engine = 3;
    state.sim.vehicleCondition.frame = 3;
    state.sim.vehicleCondition.scanner = 3;
    state.sim.vehicleCondition.storage = 3;
    state.sim.vehicleCondition.shielding = 3;
    state.sim.vehicleCondition.suspension = 3;

    tryFieldRepairOnMap(state);

    expect(state.health).toBe(3);
    expect(state.mapMessage).toBe(`Applied med patch: +${MEDPATCH_HEAL_AMOUNT} HP (-${MEDPATCH_SCRAP_COST} scrap).`);
    expect(state.mapMessageTimer).toBe(3);
  });

  it('installs the selected site upgrade and exposes map scanner flags for map content builders', () => {
    const state = createInitialRuntimeState(720, 'map-scene-install');
    state.scene = 'map';
    state.sim.scrap = 5;
    state.sim.vehicle.scanner = 3;

    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }
    currentNode.type = 'town';
    expect(getInstallOffers(state.sim, 'town').map((offer) => offer.subsystem)).toEqual(['engine', 'storage']);
    state.mapInstallSelectionIndex = 1;

    tryInstallUpgradeOnMap(state);

    expect(state.sim.vehicle.storage).toBe(2);
    expect(state.mapMessage).toContain('Installed storage module Lv.2 at town site');
    expect(buildMapScannerFlags(state)).toEqual({
      hasAutoLinkScanner: true,
      hasCompletedCurrentNode: false
    });
  });

  it('clamps stale map selection indices back into the current route and site ranges', () => {
    const state = createInitialRuntimeState(720, 'map-scene-normalize');
    state.scene = 'map';
    state.mapSelectionIndex = 99;
    state.mapInstallSelectionIndex = 99;

    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }
    currentNode.type = 'anomaly';

    normalizeMapSelectionIndex(state);
    normalizeMapInstallSelectionIndex(state);

    expect(state.mapSelectionIndex).toBe(connectedNeighbors(state.sim).length - 1);
    expect(state.mapInstallSelectionIndex).toBe(getInstallOffers(state.sim, 'anomaly').length - 1);
  });

  it('ticks map timers, advances rotation, and returns the map-enter message only while on the map', () => {
    const state = createInitialRuntimeState(720, 'map-scene-step');
    state.scene = 'map';
    state.mapMessage = 'stale';
    state.mapMessageTimer = 1;

    stepMapScene(state, 0.5, 1);

    expect(state.mapMessageTimer).toBe(0.5);
    expect(state.mapRotationVelocity).toBeGreaterThan(0);
    expect(state.mapRotation).toBeGreaterThan(-0.22);
    expect(mapSceneStatusText(state)).toBe('Choose a connected route and press Enter to travel.');

    resetRunFromCurrentNode(state);
    state.scene = 'run';
    state.mapMessage = 'preserve this';

    expect(mapSceneStatusText(state)).toBe('preserve this');
  });
});
