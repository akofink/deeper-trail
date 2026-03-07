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

  it('marks expedition-goal completions as complete before returning to the map', () => {
    const state = buildRuntimeState('expedition-goal-flow');
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    const completion = completeCurrentNodeRun(state);

    expect(completion.expeditionCompleted).toBe(true);
    expect(state.expeditionComplete).toBe(true);
    expect(state.mode).toBe('won');
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
