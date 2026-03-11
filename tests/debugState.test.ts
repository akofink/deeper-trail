import { describe, expect, it } from 'vitest';

import { connectedNeighbors, findNode } from '../src/engine/sim/world';
import { buildDebugStateSnapshot } from '../src/game/runtime/debugState';
import { createInitialRuntimeState, resetRunFromCurrentNode } from '../src/game/runtime/runtimeState';
import { getMaxHealth } from '../src/engine/sim/vehicle';

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
    state.sim.vehicle.scanner = 2;

    const snapshot = buildDebugStateSnapshot(state, 900, getMaxHealth(state.sim.vehicle));

    expect(snapshot.map.selectedRoute).toMatchObject({
      nodeId: selectedRoute.nodeId,
      nodeType: 'anomaly',
      objectiveRule: 'boosted',
      objectiveSummary: 'Boost-sync relays + sync gates',
      knowledge: {
        benefitKnown: true,
        objectiveKnown: false,
        riskKnown: false
      }
    });
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
});
