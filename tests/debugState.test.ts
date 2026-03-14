import { describe, expect, it } from 'vitest';

import { connectedNeighbors, findNode, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
import { buildDebugStateSnapshot } from '../src/game/runtime/debugState';
import { createInitialRuntimeState, resetRunFromCurrentNode } from '../src/game/runtime/runtimeState';
import { getMaxHealth } from '../src/engine/sim/vehicle';

function findBestLeadSelection(state: ReturnType<typeof createInitialRuntimeState>): number {
  for (const node of state.sim.world.nodes) {
    const currentLegs = shortestLegCountBetweenNodes(state.sim, node.id, state.expeditionGoalNodeId);
    if (currentLegs === null || currentLegs === 0) {
      continue;
    }

    state.sim.currentNodeId = node.id;
    const neighbors = connectedNeighbors(state.sim)
      .map((neighbor, index) => ({
        index,
        ...neighbor,
        legs: shortestLegCountBetweenNodes(state.sim, neighbor.nodeId, state.expeditionGoalNodeId)
      }))
      .filter((neighbor): neighbor is { index: number; nodeId: string; distance: number; legs: number } => neighbor.legs !== null);

    const best = neighbors.reduce<typeof neighbors[number] | null>(
      (selected, neighbor) => (selected === null || neighbor.legs < selected.legs ? neighbor : selected),
      null
    );
    if (best) {
      return best.index;
    }
  }

  throw new Error('Expected a current node with a best connected lead');
}

describe('buildDebugStateSnapshot', () => {
  it('reports selected-route knowledge using scanner intel tiers', () => {
    const state = createInitialRuntimeState(720, 'debug-snapshot-map');
    const selectedRoute = connectedNeighbors(state.sim)[0];

    expect(selectedRoute).toBeDefined();
    if (!selectedRoute) {
      throw new Error('Expected a connected route');
    }

    const selectedNode = findNode(state.sim, selectedRoute.nodeId);
    expect(selectedNode).toBeDefined();
    if (!selectedNode) {
      throw new Error('Expected selected node');
    }

    selectedNode.type = 'anomaly';
    state.mapSelectionIndex = 0;
    state.mapInstallSelectionIndex = 1;
    state.sim.vehicle.scanner = 2;

    const snapshot = buildDebugStateSnapshot(state, 900, getMaxHealth(state.sim.vehicle));

    expect(snapshot.map.selectedRoute).toMatchObject({
      nodeId: selectedRoute.nodeId,
      nodeType: 'anomaly',
      objectiveRule: 'boosted',
      objectiveSummary: 'Boost-sync relays + sync gates',
      isBestLead: false,
      bestLeadArrivalRewardHint: null,
      knowledge: {
        benefitKnown: true,
        objectiveKnown: false,
        riskKnown: false
      }
    });
    expect(snapshot.sim.shareCode).toMatch(/^DT1-[A-Z0-9]+-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
    expect(snapshot.map.installOfferIndex).toBe(1);
    expect(snapshot.map.installOffers).toHaveLength(2);
  });

  it('reports run objective progress for biome-specific support goals', () => {
    const state = createInitialRuntimeState(720, 'debug-snapshot-run');
    const currentNode = findNode(state.sim, state.sim.currentNodeId);

    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }

    currentNode.type = 'anomaly';
    resetRunFromCurrentNode(state);

    state.beacons[0]!.activated = true;
    state.syncGates[0]!.stabilized = true;
    state.player.x = 240;
    state.player.vx = 134.4;
    state.player.invuln = 0.336;
    state.elapsedSeconds = 12.345;
    state.cameraX = 220;

    const snapshot = buildDebugStateSnapshot(state, 800, getMaxHealth(state.sim.vehicle));

    expect(snapshot.run.objectiveRule).toBe('boosted');
    expect(snapshot.run.beacons[0]).toMatchObject({
      activated: true,
      requiredFacing: 'RIGHT',
      facingAligned: true
    });
    expect(snapshot.run.objectiveProgress).toEqual({
      primaryCompleted: 1,
      primaryTotal: state.beacons.length,
      supportCompleted: 1,
      supportTotal: state.syncGates.length,
      supportKey: 'syncGates'
    });
    expect(snapshot.run.player).toMatchObject({
      x: 240,
      vx: 134,
      invulnSeconds: 0.34
    });
    expect(snapshot.run.camera).toEqual({
      x: 220,
      width: 800,
      visibleRangeX: [220, 1020]
    });
  });

  it('exposes pending legacy carry-over state for automation and debugging', () => {
    const state = createInitialRuntimeState(720, 'debug-snapshot-legacy', [
      {
        type: 'vented-shield',
        note: 'Legacy echo: vented channel re-primes shield charge on the next route.',
        sourceTitle: 'Vented Bloom Channel'
      }
    ]);

    const snapshot = buildDebugStateSnapshot(state, 900, getMaxHealth(state.sim.vehicle));

    expect(snapshot.sim.legacyCarryOvers).toEqual([
      {
        type: 'vented-shield',
        note: 'Legacy echo: vented channel re-primes shield charge on the next route.',
        sourceTitle: 'Vented Bloom Channel'
      }
    ]);
    expect(snapshot.map.selectedRoute).toMatchObject({
      afterglowPreview: null,
      legacyEchoPreview: ['Vented Bloom Channel: shield charge re-primed after arrival']
    });
  });

  it('exposes active post-goal afterglow preview on the selected route', () => {
    const state = createInitialRuntimeState(720, 'debug-snapshot-afterglow');
    state.expeditionComplete = true;
    state.postGoalRouteHookType = 'salvage-echo';
    state.postGoalRouteHookCharges = 2;

    const snapshot = buildDebugStateSnapshot(state, 900, getMaxHealth(state.sim.vehicle));

    expect(snapshot.map.selectedRoute).toMatchObject({
      afterglowPreview: '+2 salvage after arrival',
      legacyEchoPreview: []
    });
  });

  it('exposes strongest-lead route tune-up previews for automation and debugging', () => {
    const state = createInitialRuntimeState(720, 'debug-snapshot-best-lead');
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    state.mapSelectionIndex = findBestLeadSelection(state);

    const snapshot = buildDebugStateSnapshot(state, 900, getMaxHealth(state.sim.vehicle));

    expect(snapshot.map.selectedRoute).toMatchObject({
      isBestLead: true
    });
    expect(snapshot.map.selectedRoute?.bestLeadArrivalRewardHint).toMatch(
      /^Lead route tune-up: \+1 (engine|frame|scanner|shielding|storage|suspension) condition on first arrival, else \+1 scrap\.$/
    );
  });

  it('reports last-travel fuel refund details for automation checks', () => {
    const state = createInitialRuntimeState(720, 'debug-snapshot-last-travel');

    state.lastTravel = {
      destinationNodeId: 'n4',
      fuelCost: 7,
      usedFreeTravel: true,
      freeTravelChargesBefore: 1,
      freeTravelChargesAfter: 0,
      fuelBefore: 19,
      fuelAfterTravel: 19,
      arrivalNodeType: 'ruin'
    };

    const snapshot = buildDebugStateSnapshot(state, 900, getMaxHealth(state.sim.vehicle));

    expect(snapshot.map.lastTravel).toEqual({
      destinationNodeId: 'n4',
      fuelCost: 7,
      usedFreeTravel: true,
      freeTravelChargesBefore: 1,
      freeTravelChargesAfter: 0,
      fuelBefore: 19,
      fuelAfterTravel: 19,
      arrivalNodeType: 'ruin'
    });
  });
});
