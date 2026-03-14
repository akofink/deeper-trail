import { describe, expect, it } from 'vitest';
import { connectedNeighbors, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
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

function findRouteComparisonCase(state: RuntimeState) {
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

    const stronger = neighbors.find((neighbor) => neighbor.legs < currentLegs) ?? null;
    const weaker = neighbors.find((neighbor) => neighbor.legs > currentLegs) ?? null;
    const best = neighbors.reduce<typeof neighbors[number] | null>(
      (selected, neighbor) => (selected === null || neighbor.legs < selected.legs ? neighbor : selected),
      null
    );

    if (stronger && weaker && best) {
      return { best, currentNodeId: node.id, stronger, weaker };
    }
  }

  throw new Error('Expected a node with stronger and weaker connected leads');
}

describe('map scene content helper', () => {
  it('gates selected-route objective intel behind scanner progression', () => {
    const state = buildRuntimeState();
    state.expeditionGoalNodeId = 'n9';
    const routeCase = findRouteComparisonCase(state);
    state.sim.currentNodeId = routeCase.currentNodeId;
    const destination = state.sim.world.nodes.find((node) => node.id === routeCase.weaker.nodeId);
    if (!destination) throw new Error('Expected destination node');
    destination.type = 'nature';
    state.sim.vehicle.scanner = 2;

    const content = buildMapSceneContent(state, routeCase.weaker.nodeId, routeCase.weaker.distance, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(content.completionState).toBe('LOCKED');
    expect(content.routeDetail).toContain('NATURE');
    expect(content.routeDetail).toContain(`dist ${routeCase.weaker.distance}  fuel ${routeCase.weaker.distance}`);
    expect(content.routeDetail).toContain('Site synergy locked: suspension lv2 repairs 1 damaged module condition on arrival.');
    expect(content.routeDetail).toContain('Objective pattern ?');
    expect(content.routeDetail).toContain('Signal triangulation offline.');
    expect(content.installHint).toContain('Site 1/2: +');
    expect(content.installHint).toContain('Left/Right cycles the rack.');
    expect(content.scannerHint).toContain('phase-lock online');
    expect(content.scannerHint).toContain('objective scan at lv.3');
    expect(content.repairHint).toContain('repair modules');
    expect(content.shareCode).toMatch(/^DT1-[A-Z0-9]+-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
    expect(content.fieldNotes.join('\n')).toContain('SIGNAL 0/3  bearing offline');

    state.sim.vehicle.scanner = 3;
    state.sim.vehicle.suspension = 2;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    const upgradedContent = buildMapSceneContent(state, routeCase.weaker.nodeId, routeCase.weaker.distance, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: true,
      hasCompletedCurrentNode: false
    });

    expect(upgradedContent.routeDetail).toContain('Air relays + canopy lifts');
    expect(upgradedContent.routeDetail).toContain('Site synergy ready: suspension lv2 repairs 1 damaged module condition on arrival.');
    expect(upgradedContent.scannerHint).toContain('objective scan');
    expect(upgradedContent.scannerHint).toContain('auto-link online');
    expect(upgradedContent.routeDetail).toContain('Signal bearing weakens.');
    expect(upgradedContent.routeDetail).toContain(`Source est. ${routeCase.weaker.legs} legs.`);
    expect(upgradedContent.fieldNotes.join('\n')).toContain('SIGNAL 2/3  depth online');
  });

  it('builds notebook field notes and completion state for explored progress', () => {
    const state = buildRuntimeState();
    state.expeditionComplete = true;
    state.postGoalRouteHookType = 'salvage-echo';
    state.postGoalRouteHookCharges = 2;
    state.postGoalRouteHookNote = 'Afterglow hook: each post-goal route yields +2 salvage.';
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
    expect(content.fieldNotes.join('\n')).toContain('AFTERGLOW 2x');
    expect(content.fieldNotes.join('\n')).toContain('NEXT ROUTE +2 salvage after arrival');
    expect(content.fieldNotes.join('\n')).toContain('post-goal route yields +2 salvage');
  });

  it('previews the concrete next-route afterglow payout on selected routes', () => {
    const state = buildRuntimeState();
    state.expeditionComplete = true;
    state.postGoalRouteHookType = 'breach-fuel';
    state.postGoalRouteHookCharges = 2;
    state.postGoalRouteHookNote = 'Afterglow hook: each post-goal route restores +4 fuel.';

    const content = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: true
    });

    expect(content.routeDetail).toContain('Next route afterglow (2x): +4 fuel after arrival');
    expect(content.routeDetail).toContain('Afterglow 2x: Afterglow hook: each post-goal route restores +4 fuel.');
  });

  it('shows the selected site module offer instead of collapsing installs to one implicit pick', () => {
    const state = buildRuntimeState();
    const currentNode = state.sim.world.nodes.find((node) => node.id === state.sim.currentNodeId);
    if (!currentNode) {
      throw new Error('Expected current node');
    }
    currentNode.type = 'town';
    state.mapInstallSelectionIndex = 1;

    const content = buildMapSceneContent(state, null, 0, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(content.installHint).toContain('Site 2/2: +storage lv2  cost 2');
    expect(content.installHint).toContain('Alt engine available.');
  });

  it('shows workshop repair pricing in towns and med-patch fallback when the workshop is idle', () => {
    const state = buildRuntimeState();
    const currentNode = state.sim.world.nodes.find((node) => node.id === state.sim.currentNodeId);
    if (!currentNode) {
      throw new Error('Expected current node');
    }

    currentNode.type = 'town';
    state.sim.vehicleCondition.engine = 1;
    state.sim.vehicleCondition.frame = 2;

    const damagedContent = buildMapSceneContent(state, null, 0, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(damagedContent.repairHint).toBe('B: town workshop restores all module integrity for 3 scrap.');

    state.sim.vehicleCondition.engine = 3;
    state.sim.vehicleCondition.frame = 3;
    state.health = 2;

    const pristineContent = buildMapSceneContent(state, null, 0, {
      canUseMedPatch: true,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(pristineContent.repairHint).toBe('B: +1 HP med patch for 2 scrap.');
  });

  it('previews first-arrival encounter payoffs on the selected route card', () => {
    const state = buildRuntimeState();
    const destination = state.sim.world.nodes.find((node) => node.id === 'n1');
    if (!destination) {
      throw new Error('Expected destination node');
    }

    destination.type = 'town';
    state.sim.notebook.entries.push({
      id: 'clue-ruin',
      clueKey: 'ruin',
      sourceNodeType: 'ruin',
      sourceNodeId: 'n2',
      dayDiscovered: 1,
      title: 'Relay Masonry',
      body: 'Ruin clue body'
    });

    const brokerPreview = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(brokerPreview.routeDetail).toContain('First arrival: Surveyor broker: +1 free transfer.');

    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;

    const synthesisPreview = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(synthesisPreview.routeDetail).toContain('First arrival:');
    expect(synthesisPreview.routeDetail).toContain('Surveyor broker: +1 free transfer');
    expect(synthesisPreview.routeDetail).toContain('reveal');

    state.sim.exploration.visitedNodeIds.push('n1');
    const revisited = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(revisited.routeDetail).not.toContain('First arrival:');
  });

  it('surfaces a pending legacy echo before the next expedition spends it', () => {
    const state = buildRuntimeState();
    state.legacyCarryOvers = [
      {
        type: 'breach-fuel',
        note: 'Legacy echo: breach reservoir restores +4 fuel on the next route.',
        sourceTitle: 'Breached Entry Core'
      }
    ];

    const content = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: true
    });

    expect(content.routeDetail).toContain('Legacy route payout: Breached Entry Core: +4 fuel after arrival');
    expect(content.routeDetail).toContain('Legacy echoes armed (1): Legacy echo: breach reservoir restores +4 fuel on the next route.');
    expect(content.fieldNotes.join('\n')).toContain('LEGACY ECHOES 1x');
    expect(content.fieldNotes.join('\n')).toContain('BREACHED ENTRY CORE');
    expect(content.fieldNotes.join('\n')).toContain('NEXT ROUTE +4 fuel after arrival');
    expect(content.fieldNotes.join('\n')).toContain('breach reservoir restores +4 fuel');
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
    state.expeditionGoalNodeId = 'n9';
    const routeCase = findRouteComparisonCase(state);
    state.sim.currentNodeId = routeCase.currentNodeId;
    state.sim.vehicle.scanner = 1;
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    const strongestNode = state.sim.world.nodes.find((node) => node.id === routeCase.best.nodeId);
    if (!strongestNode) {
      throw new Error('Expected strongest lead node');
    }
    strongestNode.type = 'nature';
    state.sim.vehicleCondition.suspension = 1;

    const strongestLead = buildMapSceneContent(state, routeCase.best.nodeId, routeCase.best.distance, {
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
    expect(strongestLead.routeDetail).toContain('Lead route tune-up: +1 suspension condition on first arrival, else +1 scrap.');
    expect(strongestLead.routeDetail).toContain('First arrival: Signal line holds on approach: +1 suspension condition.');

    const weakerLead = buildMapSceneContent(state, routeCase.weaker.nodeId, routeCase.weaker.distance, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: false,
      hasCompletedCurrentNode: false
    });

    expect(weakerLead.routeDetail).toContain('benefit ? / risk ?');
    expect(weakerLead.routeDetail).toContain('Objective pattern ?');
    expect(weakerLead.routeDetail).not.toContain('Best current lead.');
    expect(weakerLead.routeDetail).not.toContain('Lead route tune-up:');
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
    expect(content.routeDetail).toContain('ruin line: first barrier collapsed and one site objective starts resolved');
  });
});
