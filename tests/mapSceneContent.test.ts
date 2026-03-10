import { describe, expect, it } from 'vitest';
import { connectedNeighbors, findNode, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
import { buildMapSceneContent } from '../src/game/runtime/mapSceneContent';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('map-scene-content');

  return {
    mode: 'playing',
    scene: 'map',
    seed: sim.seed,
    expeditionGoalNodeId: 'n9',
    expeditionComplete: false,
    score: 0,
    health: 3,
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

function pickRouteIntelSetup(state: RuntimeState): {
  strongestLeadNodeId: string;
  strongestLeadLegs: number;
  weakerLeadNodeId: string;
} {
  const hubNode = state.sim.world.nodes.find((node) => {
    const degree = state.sim.world.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
    return degree >= 2;
  });
  expect(hubNode).toBeDefined();
  if (!hubNode) {
    throw new Error('Expected a hub node for route intel checks');
  }

  state.sim.currentNodeId = hubNode.id;
  state.expeditionGoalNodeId = state.sim.world.nodes.at(-1)?.id ?? hubNode.id;
  const rankedNeighbors = connectedNeighbors(state.sim)
    .map((neighbor) => ({
      nodeId: neighbor.nodeId,
      legs: shortestLegCountBetweenNodes(state.sim, neighbor.nodeId, state.expeditionGoalNodeId)
    }))
    .filter((entry): entry is { nodeId: string; legs: number } => entry.legs !== null)
    .sort((a, b) => a.legs - b.legs);
  const strongestLead = rankedNeighbors[0];
  const weakerLead = rankedNeighbors.at(-1);
  expect(strongestLead).toBeDefined();
  expect(weakerLead).toBeDefined();
  if (!strongestLead || !weakerLead) {
    throw new Error('Expected ranked connected leads');
  }

  return {
    strongestLeadNodeId: strongestLead.nodeId,
    strongestLeadLegs: strongestLead.legs,
    weakerLeadNodeId: weakerLead.nodeId
  };
}

describe('map scene content helper', () => {
  it('gates selected-route objective intel behind scanner progression', () => {
    const state = buildRuntimeState();
    const routeSetup = pickRouteIntelSetup(state);
    const destination = findNode(state.sim, routeSetup.strongestLeadNodeId);
    if (!destination) throw new Error('Expected destination node');
    destination.type = 'nature';
    state.sim.vehicle.scanner = 2;

    const content = buildMapSceneContent(state, routeSetup.strongestLeadNodeId, 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(content.completionState).toBe('LOCKED');
    expect(content.routeDetail).toContain('NATURE');
    expect(content.routeDetail).toContain('dist 7  fuel 7');
    expect(content.routeDetail).toContain('Objective pattern ?');
    expect(content.routeDetail).toContain('Signal triangulation offline.');
    expect(content.installHint.length).toBeGreaterThan(0);
    expect(content.scannerHint).toContain('phase-lock online');
    expect(content.scannerHint).toContain('objective scan at lv.3');
    expect(content.repairHint).toContain('repair modules');
    expect(content.fieldNotes.join('\n')).toContain('SIGNAL 0/3  bearing offline');

    state.sim.vehicle.scanner = 3;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    const upgradedContent = buildMapSceneContent(state, routeSetup.strongestLeadNodeId, 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: true,
      hasCompletedCurrentNode: false
    });

    expect(upgradedContent.routeDetail).toContain('Air relays + canopy lifts');
    expect(upgradedContent.scannerHint).toContain('objective scan');
    expect(upgradedContent.scannerHint).toContain('auto-link online');
    expect(upgradedContent.routeDetail).toContain('Signal bearing');
    expect(upgradedContent.routeDetail).toContain(
      `Source est. ${routeSetup.strongestLeadLegs} leg${routeSetup.strongestLeadLegs === 1 ? '' : 's'}.`
    );
    expect(upgradedContent.fieldNotes.join('\n')).toContain('SIGNAL 2/3  depth online');
  });

  it('builds notebook field notes and completion state for explored progress', () => {
    const state = buildRuntimeState();
    state.expeditionComplete = true;
    state.sim.notebook.entries.push({
      id: 'clue-ruin',
      clueKey: 'ruin',
      sourceNodeType: 'ruin',
      sourceNodeId: 'n2',
      dayDiscovered: 1,
      title: 'Relay Masonry',
      body: 'Ruin clue body'
    });
    state.sim.notebook.synthesisUnlocked = true;
    state.sim.exploration.biomeKnowledge.ruin.visits = 2;
    state.sim.exploration.biomeKnowledge.ruin.benefitKnown = true;
    state.sim.exploration.biomeKnowledge.ruin.objectiveKnown = true;
    state.sim.exploration.biomeKnowledge.ruin.riskKnown = true;

    const content = buildMapSceneContent(state, null, 0, {
      canUseMedPatch: true,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: true,
      hasCompletedCurrentNode: true
    });

    expect(content.completionState).toBe('COMPLETE');
    expect(content.routeDetail).toContain('Select a connected route');
    expect(content.repairHint).toContain('+1 HP');
    expect(content.scannerHint).toContain('auto-link online');
    expect(content.fieldNotes.join('\n')).toContain('NOTEBOOK');
    expect(content.fieldNotes.join('\n')).toContain('SYNTH');
    expect(content.fieldNotes.join('\n')).toContain('RELAY MASONRY');
    expect(content.fieldNotes.join('\n')).toContain('Ordered relays + impact plates');
  });

  it('uses persisted biome objective intel even before scanner upgrades or a direct visit', () => {
    const state = buildRuntimeState();
    state.sim.vehicle.scanner = 1;
    const destination = state.sim.world.nodes.find((node) => node.id === 'n1');
    if (!destination) throw new Error('Expected destination node');
    destination.type = 'anomaly';
    state.sim.exploration.biomeKnowledge.anomaly.benefitKnown = true;
    state.sim.exploration.biomeKnowledge.anomaly.objectiveKnown = true;
    state.sim.exploration.biomeKnowledge.anomaly.riskKnown = true;

    const content = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(content.routeDetail).toContain('Boost-sync relays + sync gates');
    expect(content.routeDetail).not.toContain('Objective pattern ?');
    expect(content.routeDetail).not.toContain('benefit ? / risk ?');
  });

  it('lets notebook synthesis decode the strongest connected lead before scanner unlocks it', () => {
    const state = buildRuntimeState();
    const routeSetup = pickRouteIntelSetup(state);
    state.sim.vehicle.scanner = 1;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    const strongestLeadNode = findNode(state.sim, routeSetup.strongestLeadNodeId);
    const weakerLeadNode = findNode(state.sim, routeSetup.weakerLeadNodeId);
    expect(strongestLeadNode).toBeDefined();
    expect(weakerLeadNode).toBeDefined();
    if (!strongestLeadNode || !weakerLeadNode) {
      throw new Error('Expected lead nodes');
    }
    strongestLeadNode.type = 'nature';
    weakerLeadNode.type = 'anomaly';

    const strongestLead = buildMapSceneContent(state, routeSetup.strongestLeadNodeId, 4, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(strongestLead.routeDetail).toContain('Shelter grove: +1 HP');
    expect(strongestLead.routeDetail).toContain('Air relays + canopy lifts');
    expect(strongestLead.routeDetail).toContain('suspension');
    expect(strongestLead.routeDetail).toContain('Best current lead.');

    const weakerLead = buildMapSceneContent(state, routeSetup.weakerLeadNodeId, 6, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(weakerLead.routeDetail).toContain('benefit ? / risk ?');
    expect(weakerLead.routeDetail).toContain('Objective pattern ?');
    expect(weakerLead.routeDetail).not.toContain('Best current lead.');
  });

  it('warns synthesized goal routes that the source approach starts with a pre-linked relay', () => {
    const state = buildRuntimeState();
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.entries.push(
      {
        id: 'clue-nature',
        clueKey: 'nature',
        sourceNodeType: 'nature',
        sourceNodeId: 'n1',
        dayDiscovered: 1,
        title: 'Nature',
        body: 'Nature'
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
        id: 'clue-ruin',
        clueKey: 'ruin',
        sourceNodeType: 'ruin',
        sourceNodeId: 'n3',
        dayDiscovered: 3,
        title: 'Ruin',
        body: 'Ruin'
      }
    );
    state.sim.notebook.synthesisUnlocked = true;
    const goalNode = state.sim.world.nodes.find((node) => node.id === state.expeditionGoalNodeId);
    if (!goalNode) {
      throw new Error('Expected expedition goal node');
    }

    const content = buildMapSceneContent(state, goalNode.id, 9, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: true
    });

    expect(content.routeDetail).toContain('SIGNAL');
    expect(content.routeDetail).toContain('B1 pre-linked');
    expect(content.routeDetail).toContain('phase reserve: +4 fuel on arrival');
    expect(content.routeDetail).toContain('ruin line: first barrier collapsed');
  });
});
