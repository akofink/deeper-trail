import { describe, expect, it } from 'vitest';
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

describe('map scene content helper', () => {
  it('gates selected-route objective intel behind scanner progression', () => {
    const state = buildRuntimeState();
    state.sim.currentNodeId = 'n4';
    state.expeditionGoalNodeId = 'n9';
    const destination = state.sim.world.nodes.find((node) => node.id === 'n1');
    if (!destination) throw new Error('Expected destination node');
    destination.type = 'nature';
    state.sim.vehicle.scanner = 2;

    const content = buildMapSceneContent(state, 'n1', 7, {
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
    const upgradedContent = buildMapSceneContent(state, 'n1', 7, {
      canUseMedPatch: false,
      medPatchHealAmount: 1,
      medPatchScrapCost: 2,
      hasAutoLinkScanner: true,
      hasCompletedCurrentNode: false
    });

    expect(upgradedContent.routeDetail).toContain('Air relays + canopy lifts');
    expect(upgradedContent.scannerHint).toContain('objective scan');
    expect(upgradedContent.scannerHint).toContain('auto-link online');
    expect(upgradedContent.routeDetail).toContain('Signal bearing weakens.');
    expect(upgradedContent.routeDetail).toContain('Source est. 8 legs.');
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
});
