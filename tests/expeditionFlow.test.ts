import { describe, expect, it } from 'vitest';
import { connectedNeighbors, expeditionGoalNodeId, findNode, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
import { attemptBeaconActivation } from '../src/game/runtime/beaconActivation';
import { buildExitLockedMessage } from '../src/game/runtime/runCompletion';
import { buildRunLayout } from '../src/game/runtime/runLayout';
import {
  applyArrivalRewards,
  completeCurrentNodeRun,
  hasCompletedCurrentNode,
  travelToNodeWithRuntimeEffects
} from '../src/game/runtime/expeditionFlow';
import { updateRunObjectives } from '../src/game/runtime/runObjectiveUpdates';
import { runObjectiveProgress } from '../src/game/runtime/runObjectiveUi';
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

function findBestLeadRoute(state: RuntimeState) {
  for (const node of state.sim.world.nodes) {
    const currentLegs = shortestLegCountBetweenNodes(state.sim, node.id, state.expeditionGoalNodeId);
    if (currentLegs === null || currentLegs === 0) {
      continue;
    }

    state.sim.currentNodeId = node.id;
    const neighbors = connectedNeighbors(state.sim)
      .map((neighbor) => ({
        ...neighbor,
        legs: shortestLegCountBetweenNodes(state.sim, neighbor.nodeId, state.expeditionGoalNodeId)
      }))
      .filter((neighbor): neighbor is { nodeId: string; distance: number; legs: number } => neighbor.legs !== null);

    const best = neighbors.reduce<typeof neighbors[number] | null>(
      (selected, neighbor) => (selected === null || neighbor.legs < selected.legs ? neighbor : selected),
      null
    );

    if (best) {
      return { best, currentNodeId: node.id };
    }
  }

  throw new Error('Expected a node with a best connected lead');
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
    expect(state.lastTravel).toEqual({
      destinationNodeId: neighbor.nodeId,
      fuelCost: neighbor.distance,
      usedFreeTravel: true,
      freeTravelChargesBefore: 1,
      freeTravelChargesAfter: 0,
      fuelBefore: 23,
      fuelAfterTravel: 23,
      arrivalNodeType: 'town'
    });
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

  it('applies capability-linked site synergies on arrival and reveals anomaly route intel', () => {
    const townState = buildRuntimeState('arrival-town-site-bonus');
    const townNode = findNode(townState.sim, townState.sim.currentNodeId);
    expect(townNode).toBeDefined();
    if (!townNode) {
      throw new Error('Expected current town node');
    }
    townNode.type = 'town';
    townState.sim.vehicle.engine = 2;
    townState.sim.fuel = 10;

    const townMessage = applyArrivalRewards(townState);

    expect(townMessage).toContain('fuel topped up +8');
    expect(townMessage).toContain('Engine tune-up cache added +4 fuel');
    expect(townState.sim.fuel).toBe(22);

    const natureState = buildRuntimeState('arrival-nature-site-bonus');
    const natureNode = findNode(natureState.sim, natureState.sim.currentNodeId);
    expect(natureNode).toBeDefined();
    if (!natureNode) {
      throw new Error('Expected current nature node');
    }
    natureNode.type = 'nature';
    natureState.sim.vehicle.suspension = 2;
    natureState.sim.vehicleCondition.frame = 1;

    const natureMessage = applyArrivalRewards(natureState);

    expect(natureMessage).toContain('Spring shelter reset frame condition +1');
    expect(natureState.sim.vehicleCondition.frame).toBe(2);

    const anomalyState = buildRuntimeState('arrival-anomaly-site-bonus');
    const anomalyNode = findNode(anomalyState.sim, anomalyState.sim.currentNodeId);
    expect(anomalyNode).toBeDefined();
    if (!anomalyNode) {
      throw new Error('Expected current anomaly node');
    }
    anomalyNode.type = 'anomaly';
    anomalyState.sim.vehicle.scanner = 2;
    const neighborTypes = connectedNeighbors(anomalyState.sim)
      .map((neighbor) => findNode(anomalyState.sim, neighbor.nodeId)?.type ?? null)
      .filter((type): type is 'town' | 'ruin' | 'nature' | 'anomaly' => type !== null);

    const anomalyMessage = applyArrivalRewards(anomalyState);

    expect(anomalyMessage).toContain('Scanner echo mapped');
    for (const type of new Set(neighborTypes)) {
      expect(anomalyState.sim.exploration.biomeKnowledge[type]).toEqual({
        visits: anomalyState.sim.exploration.biomeKnowledge[type].visits,
        benefitKnown: true,
        objectiveKnown: true,
        riskKnown: true
      });
    }
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

  it('turns the strongest synthesized lead into a first-arrival module tune-up', () => {
    const state = buildRuntimeState('arrival-best-lead');
    const routeCase = findBestLeadRoute(state);
    state.sim.currentNodeId = routeCase.currentNodeId;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.vehicleCondition.suspension = 1;

    const destination = findNode(state.sim, routeCase.best.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected best-lead destination node');
    }
    destination.type = 'nature';

    const result = travelToNodeWithRuntimeEffects(state, routeCase.best.nodeId);

    expect(result.didTravel).toBe(true);
    expect(state.sim.vehicleCondition.suspension).toBe(2);
    expect(state.mapMessage).toContain('Signal line held on approach: suspension condition +1.');
  });

  it('turns ruin clues into first-arrival frame tune-ups with a scrap fallback', () => {
    const damagedState = buildRuntimeState('arrival-ruin-clue');
    const damagedNeighbor = connectedNeighbors(damagedState.sim)[0];
    expect(damagedNeighbor).toBeDefined();
    if (!damagedNeighbor) {
      throw new Error('Expected connected neighbor');
    }

    damagedState.sim.notebook.discoveredClues.ruin = true;
    damagedState.sim.vehicleCondition.frame = 1;
    const damagedDestination = findNode(damagedState.sim, damagedNeighbor.nodeId);
    expect(damagedDestination).toBeDefined();
    if (!damagedDestination) {
      throw new Error('Expected destination node');
    }
    damagedDestination.type = 'ruin';

    const damagedResult = travelToNodeWithRuntimeEffects(damagedState, damagedNeighbor.nodeId);

    expect(damagedResult.didTravel).toBe(true);
    expect(damagedState.sim.vehicleCondition.frame).toBe(2);
    expect(damagedState.mapMessage).toContain('Masonry brace trace matched the notebook: frame condition +1.');

    const stableState = buildRuntimeState('arrival-ruin-clue-stable');
    const stableNeighbor = connectedNeighbors(stableState.sim)[0];
    expect(stableNeighbor).toBeDefined();
    if (!stableNeighbor) {
      throw new Error('Expected connected neighbor');
    }

    stableState.sim.notebook.discoveredClues.ruin = true;
    stableState.sim.vehicleCondition.frame = 3;
    stableState.sim.scrap = 0;
    const stableDestination = findNode(stableState.sim, stableNeighbor.nodeId);
    expect(stableDestination).toBeDefined();
    if (!stableDestination) {
      throw new Error('Expected destination node');
    }
    stableDestination.type = 'ruin';

    const stableResult = travelToNodeWithRuntimeEffects(stableState, stableNeighbor.nodeId);

    expect(stableResult.didTravel).toBe(true);
    expect(stableState.sim.scrap).toBe(3);
    expect(stableState.mapMessage).toContain('Masonry brace trace matched the notebook: salvage cache +1 scrap.');
  });

  it('turns anomaly clues into first-arrival fuel recovery', () => {
    const state = buildRuntimeState('arrival-anomaly-clue');
    const neighbor = connectedNeighbors(state.sim)[0];
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected connected neighbor');
    }

    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.fuel = 5;
    const destination = findNode(state.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected destination node');
    }
    destination.type = 'anomaly';

    const result = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(result.didTravel).toBe(true);
    expect(state.sim.fuel).toBe(result.fuelCost === undefined ? 7 : 5 - result.fuelCost + 2);
    expect(state.mapMessage).toContain('Carrier pocket condensed out of the phase line: restored +2 fuel.');
  });

  it('marks expedition-goal completions as complete before returning to the map', () => {
    const state = buildRuntimeState('expedition-goal-flow');
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.entries.push(
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
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;

    const completion = completeCurrentNodeRun(state);

    expect(completion.expeditionCompleted).toBe(true);
    expect(state.expeditionComplete).toBe(true);
    expect(state.mode).toBe('won');
    expect(state.postGoalRouteHookCharges).toBe(2);
    expect(state.postGoalRouteHookType).toBe('breach-fuel');
    expect(state.postGoalRouteHookNote).toContain('Afterglow hook');
  });

  it('covers the full nature objective path before unlocking map travel', () => {
    const state = buildRuntimeState('nature-objective-path');
    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    expect(currentNode).toBeDefined();
    if (!currentNode) {
      throw new Error('Expected current node');
    }

    currentNode.type = 'nature';
    state.groundY = 500;
    const layout = buildRunLayout(state.groundY, 'nature');
    state.beacons = layout.beacons;
    state.canopyLifts = layout.canopyLifts;
    state.goalX = layout.goalX;

    for (const beacon of state.beacons) {
      state.player.x = beacon.x - state.player.w * 0.5;
      state.player.y = beacon.y - state.player.h * 0.5;
      state.player.onGround = false;
      expect(attemptBeaconActivation(state, 'manual')).toBe(true);
    }

    const partialProgress = runObjectiveProgress(state);
    expect(partialProgress).toEqual({
      completed: 3,
      total: 5,
      beaconsRemaining: 0,
      serviceStopsRemaining: 0,
      syncGatesRemaining: 0,
      canopyLiftsRemaining: 2,
      impactPlatesRemaining: 0
    });
    expect(buildExitLockedMessage(partialProgress)).toBe('Exit locked: 2 canopy lifts left.');

    state.elapsedSeconds = 0.1;
    for (const lift of state.canopyLifts) {
      state.player.x = lift.x - state.player.w * 0.5;
      state.player.y = lift.y - state.player.h * 0.5;
      state.player.onGround = false;

      updateRunObjectives(state, {
        dt: 0.6,
        landedThisFrame: false,
        landingSpeed: 0
      });
    }

    const completionReady = runObjectiveProgress(state);
    expect(completionReady.completed).toBe(5);
    expect(completionReady.total).toBe(5);
    expect(state.canopyLifts.every((lift) => lift.charted)).toBe(true);
    expect(state.score).toBe(85);

    const completion = completeCurrentNodeRun(state);

    expect(completion.notebookUpdate.newEntries[0]?.clueKey).toBe('nature');
    expect(hasCompletedCurrentNode(state)).toBe(true);
    expect(state.scene).toBe('map');
    expect(state.mode).toBe('playing');
    expect(state.freeTravelCharges).toBe(1);
    expect(state.mapMessage).toBe('Route board unlocked. Pick a connected route and press Enter to travel.');
  });

  it('consumes the completion free-travel charge after finishing all nature objectives and traveling', () => {
    const state = buildRuntimeState('nature-objective-travel-refund');
    const currentNode = findNode(state.sim, state.sim.currentNodeId);
    const neighbor = connectedNeighbors(state.sim)[0];
    expect(currentNode).toBeDefined();
    expect(neighbor).toBeDefined();
    if (!currentNode || !neighbor) {
      throw new Error('Expected deterministic start node and connected neighbor');
    }

    currentNode.type = 'nature';
    const destination = findNode(state.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected destination node');
    }
    destination.type = 'nature';

    state.sim.fuel = 18;
    state.groundY = 500;
    const layout = buildRunLayout(state.groundY, 'nature');
    state.beacons = layout.beacons;
    state.canopyLifts = layout.canopyLifts;
    state.goalX = layout.goalX;

    for (const beacon of state.beacons) {
      state.player.x = beacon.x - state.player.w * 0.5;
      state.player.y = beacon.y - state.player.h * 0.5;
      state.player.onGround = false;
      expect(attemptBeaconActivation(state, 'manual')).toBe(true);
    }

    for (const lift of state.canopyLifts) {
      state.player.x = lift.x - state.player.w * 0.5;
      state.player.y = lift.y - state.player.h * 0.5;
      state.player.onGround = false;
      updateRunObjectives(state, {
        dt: 0.6,
        landedThisFrame: false,
        landingSpeed: 0
      });
    }

    const completion = completeCurrentNodeRun(state);
    expect(completion.expeditionCompleted).toBe(false);
    expect(state.freeTravelCharges).toBe(1);
    const fuelAfterCompletion = state.sim.fuel;

    const travel = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(travel.didTravel).toBe(true);
    expect(travel.usedFreeTravel).toBe(true);
    expect(state.freeTravelCharges).toBe(0);
    expect(state.sim.currentNodeId).toBe(neighbor.nodeId);
    expect(state.sim.fuel).toBe(fuelAfterCompletion);
    expect(state.health).toBe(3);
    expect(state.mapMessage).toContain('Arrived in nature: stabilized +1 health.');
  });

  it('lets a banked free transfer move to a connected node even at zero fuel', () => {
    const state = buildRuntimeState('free-transfer-zero-fuel');
    const neighbor = connectedNeighbors(state.sim)[0];
    expect(neighbor).toBeDefined();
    if (!neighbor) {
      throw new Error('Expected deterministic connected neighbor');
    }

    state.freeTravelCharges = 1;
    state.sim.fuel = 0;
    const destination = findNode(state.sim, neighbor.nodeId);
    expect(destination).toBeDefined();
    if (!destination) {
      throw new Error('Expected connected destination node');
    }
    destination.type = 'town';

    const travel = travelToNodeWithRuntimeEffects(state, neighbor.nodeId);

    expect(travel.didTravel).toBe(true);
    expect(travel.usedFreeTravel).toBe(true);
    expect(state.freeTravelCharges).toBe(0);
    expect(state.sim.currentNodeId).toBe(neighbor.nodeId);
    expect(state.sim.day).toBe(1);
    expect(state.sim.fuel).toBe(8);
    expect(state.mapMessage).toContain('Arrived at town: fuel topped up +8.');
  });

  it('branches expedition-goal arrival rewards from the ordered notebook clue sequence', () => {
    const healthState = buildRuntimeState('goal-arrival-health');
    healthState.sim.currentNodeId = healthState.expeditionGoalNodeId;
    const healthGoalNode = findNode(healthState.sim, healthState.expeditionGoalNodeId);
    expect(healthGoalNode).toBeDefined();
    if (!healthGoalNode) {
      throw new Error('Expected expedition goal node');
    }
    healthGoalNode.type = 'ruin';
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
    const fuelGoalNode = findNode(fuelState.sim, fuelState.expeditionGoalNodeId);
    expect(fuelGoalNode).toBeDefined();
    if (!fuelGoalNode) {
      throw new Error('Expected expedition goal node');
    }
    fuelGoalNode.type = 'ruin';
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
