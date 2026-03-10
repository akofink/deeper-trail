import { describe, expect, it } from 'vitest';
import { connectedNeighbors, expeditionGoalNodeId, findNode } from '../src/engine/sim/world';
import {
  applyArrivalRewards,
  completeCurrentNodeRun,
  hasCompletedCurrentNode,
  travelToNodeWithRuntimeEffects
} from '../src/game/runtime/expeditionFlow';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(seed = 'expedition-flow'): RuntimeState {
  const sim = createInitialGameState(seed);

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: expeditionGoalNodeId(sim),
    expeditionComplete: false,
    score: 0,
    health: 2,
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
    beacons: [],
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

describe('expedition flow runtime helpers', () => {
  it('completes a node run, grants a free trip, and refunds one connected travel cost before arrival rewards', () => {
    const state = buildRuntimeState();
    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    const neighbor = connectedNeighbors(state.sim)[0];

    expect(currentNode).toBeDefined();
    expect(neighbor).toBeDefined();

    if (!currentNode || !neighbor) {
      throw new Error('Expected deterministic start node and connected neighbor');
    }

    currentNode.type = 'ruin';
    const destination = findNode(state.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected connected destination node');
    }
    destination.type = 'town';

    state.sim.fuel = 20;

    const completion = completeCurrentNodeRun(state);

    expect(hasCompletedCurrentNode(state)).toBe(true);
    expect(state.scene).toBe('map');
    expect(state.mode).toBe('playing');
    expect(state.freeTravelCharges).toBe(1);
    expect(state.health).toBe(3);
    expect(state.sim.day).toBe(1);
    expect(state.sim.fuel).toBe(23);
    expect(state.mapMessage).toBe('Route board unlocked. Pick a connected route and press Enter to travel.');
    expect(state.mapMessageTimer).toBe(4);
    expect(completion.flawlessRecovery).toBe(1);
    expect(completion.notebookUpdate.newEntries[0]?.clueKey).toBe('ruin');

    const travel = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(travel.didTravel).toBe(true);
    expect(travel.usedFreeTravel).toBe(true);
    expect(state.freeTravelCharges).toBe(1);
    expect(state.sim.currentNodeId).toBe(neighbor.nodeId);
    expect(state.sim.day).toBe(2);
    expect(state.sim.fuel).toBe(31);
    expect(state.mapMessage).toContain('fuel topped up');
    expect(state.mapMessage).toContain('Surveyor broker');
    expect(state.sim.exploration.biomeKnowledge.town.benefitKnown).toBe(true);
  });

  it('applies anomaly arrival rewards and restores shield charge after travel effects', () => {
    const state = buildRuntimeState('expedition-anomaly-flow');
    const neighbor = connectedNeighbors(state.sim)[0];
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected connected neighbor');
    }

    state.sim.vehicle.shielding = 2;
    state.shieldChargeAvailable = false;
    const destination = findNode(state.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected destination node');
    }
    destination.type = 'anomaly';

    const result = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(result.didTravel).toBe(true);
    expect(result.arrivalNodeType).toBe('anomaly');
    expect(state.sim.vehicle.scanner).toBe(2);
    expect(state.shieldChargeAvailable).toBe(true);
    expect(state.mapMessage).toContain('Shield charge restored');
  });

  it('adds deterministic first-visit ruin encounter scrap for upgraded scanners', () => {
    const state = buildRuntimeState('arrival-ruin-encounter');
    const neighbor = connectedNeighbors(state.sim)[0];
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected connected neighbor');
    }
    state.sim.vehicle.scanner = 2;
    const node = findNode(state.sim, neighbor.nodeId);
    expect(node).toBeDefined();
    if (!node) {
      throw new Error('Expected neighbor node');
    }
    node.type = 'ruin';

    travelToNodeWithRuntimeEffects(state, neighbor.nodeId);
    const firstMessage = state.mapMessage;
    const scrapAfterFirstArrival = state.sim.scrap;
    const secondMessage = applyArrivalRewards(state);

    expect(firstMessage).toContain('scavenged +2 scrap');
    expect(firstMessage).toContain('alignment cache +1 scrap');
    expect(scrapAfterFirstArrival).toBe(3);
    expect(secondMessage).toContain('scavenged +2 scrap');
    expect(secondMessage).not.toContain('alignment cache +1 scrap');
    expect(state.sim.scrap).toBe(5);
  });

  it('banks an anomaly free transfer when synthesis and shielding stabilize the arrival pulse', () => {
    const state = buildRuntimeState('arrival-anomaly-encounter');
    const neighbor = connectedNeighbors(state.sim)[0];
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected connected neighbor');
    }

    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.vehicle.shielding = 2;
    const destination = findNode(state.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected destination node');
    }
    destination.type = 'anomaly';

    const result = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(result.didTravel).toBe(true);
    expect(state.freeTravelCharges).toBe(1);
    expect(state.mapMessage).toContain('Phase corridor');
  });

  it('lets synthesized town arrivals annotate connected biome routes for future map decisions', () => {
    const state = buildRuntimeState('arrival-town-synthesis');
    const neighbor = connectedNeighbors(state.sim).find(({ nodeId }) => {
      const degree = state.sim.world.edges.reduce((count, edge) => {
        if (edge.from === nodeId || edge.to === nodeId) {
          return count + 1;
        }
        return count;
      }, 0);
      return degree > 1;
    });
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected connected neighbor with multiple exits');
    }

    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    const townNode = findNode(state.sim, neighbor.nodeId);
    expect(townNode).toBeDefined();
    if (!townNode) {
      throw new Error('Expected neighbor node');
    }
    townNode.type = 'town';

    const townNeighborIds = state.sim.world.edges.flatMap((edge) => {
      if (edge.from === townNode.id) return [edge.to];
      if (edge.to === townNode.id) return [edge.from];
      return [];
    });

    let assignedRouteCount = 0;
    townNeighborIds.forEach((nodeId) => {
      const node = findNode(state.sim, nodeId);
      if (!node || node.id === state.sim.currentNodeId) {
        return;
      }
      node.type = assignedRouteCount % 2 === 0 ? 'ruin' : 'anomaly';
      assignedRouteCount += 1;
    });
    expect(assignedRouteCount).toBeGreaterThan(0);

    const result = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(result.didTravel).toBe(true);
    expect(state.freeTravelCharges).toBe(1);
    expect(state.mapMessage).toContain('synthesis notes');
    expect(state.sim.exploration.biomeKnowledge.ruin.objectiveKnown).toBe(true);
    expect(state.sim.exploration.biomeKnowledge.ruin.riskKnown).toBe(true);
  });

  it('marks expedition-goal completions as complete before returning to the map', () => {
    const state = buildRuntimeState('expedition-goal-flow');
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    const completion = completeCurrentNodeRun(state);

    expect(completion.expeditionCompleted).toBe(true);
    expect(state.expeditionComplete).toBe(true);
    expect(state.mode).toBe('won');
  });

  it('branches expedition-goal arrival rewards from the ordered notebook clue sequence', () => {
    const healthState = buildRuntimeState('goal-arrival-health');
    healthState.sim.currentNodeId = healthState.expeditionGoalNodeId;
    healthState.sim.notebook.entries.push(
      {
        id: 'clue-ruin',
        clueKey: 'ruin',
        sourceNodeType: 'ruin',
        sourceNodeId: 'n1',
        dayDiscovered: 1,
        title: 'Ruin',
        body: 'Ruin'
      },
      {
        id: 'clue-nature',
        clueKey: 'nature',
        sourceNodeType: 'nature',
        sourceNodeId: 'n2',
        dayDiscovered: 2,
        title: 'Nature',
        body: 'Nature'
      },
      {
        id: 'clue-anomaly',
        clueKey: 'anomaly',
        sourceNodeType: 'anomaly',
        sourceNodeId: 'n3',
        dayDiscovered: 3,
        title: 'Anomaly',
        body: 'Anomaly'
      }
    );
    healthState.sim.notebook.synthesisUnlocked = true;
    healthState.health = 1;

    const healthMessage = applyArrivalRewards(healthState);

    expect(healthState.health).toBe(2);
    expect(healthMessage).toContain('Goal decode: shelter bloom: +1 health on arrival.');

    const fuelState = buildRuntimeState('goal-arrival-fuel');
    fuelState.sim.currentNodeId = fuelState.expeditionGoalNodeId;
    fuelState.sim.notebook.entries.push(
      {
        id: 'clue-ruin',
        clueKey: 'ruin',
        sourceNodeType: 'ruin',
        sourceNodeId: 'n1',
        dayDiscovered: 1,
        title: 'Ruin',
        body: 'Ruin'
      },
      {
        id: 'clue-anomaly',
        clueKey: 'anomaly',
        sourceNodeType: 'anomaly',
        sourceNodeId: 'n2',
        dayDiscovered: 2,
        title: 'Anomaly',
        body: 'Anomaly'
      },
      {
        id: 'clue-nature',
        clueKey: 'nature',
        sourceNodeType: 'nature',
        sourceNodeId: 'n3',
        dayDiscovered: 3,
        title: 'Nature',
        body: 'Nature'
      }
    );
    fuelState.sim.notebook.synthesisUnlocked = true;
    fuelState.sim.fuel = 10;

    const fuelMessage = applyArrivalRewards(fuelState);

    expect(fuelState.sim.fuel).toBeGreaterThanOrEqual(14);
    expect(fuelMessage).toContain('Goal decode: phase reserve: +4 fuel on arrival.');
  });

  it('reports arrival messages even when called directly', () => {
    const state = buildRuntimeState('arrival-direct');
    const node = findNode(state.sim, state.sim.currentNodeId);
    expect(node).toBeDefined();
    if (!node) {
      throw new Error('Expected current node');
    }

    node.type = 'nature';
    state.health = 1;

    const message = applyArrivalRewards(state);

    expect(message).toContain('stabilized');
    expect(state.health).toBe(2);
  });
});
