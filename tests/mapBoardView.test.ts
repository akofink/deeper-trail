import { describe, expect, it } from 'vitest';
import { notebookSignalRouteIntel } from '../src/engine/sim/notebook';
import { connectedNeighbors, shortestLegCountBetweenNodes } from '../src/engine/sim/world';
import { buildMapActionChips, buildMapBoardView } from '../src/game/runtime/mapBoardView';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('map-board-view');

  return {
    mode: 'playing',
    scene: 'map',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
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
    const holding = neighbors.find((neighbor) => neighbor.legs === currentLegs) ?? null;
    const weaker = neighbors.find((neighbor) => neighbor.legs > currentLegs) ?? null;
    const best = neighbors.reduce<typeof neighbors[number] | null>(
      (selected, neighbor) => (selected === null || neighbor.legs < selected.legs ? neighbor : selected),
      null
    );

    if (stronger && holding && weaker && best) {
      return { best, currentNodeId: node.id, holding, stronger, weaker };
    }
  }

  throw new Error('Expected a node with stronger, holding, and weaker connected routes');
}

function findEdge(view: ReturnType<typeof buildMapBoardView>, fromId: string, toId: string) {
  const fromNode = view.nodes.find((node) => node.id === fromId);
  const toNode = view.nodes.find((node) => node.id === toId);
  if (!fromNode || !toNode) {
    throw new Error(`Expected nodes ${fromId} and ${toId}`);
  }

  return (
    view.edges.find(
      (edge) =>
        (edge.from.x === fromNode.x && edge.from.y === fromNode.y && edge.to.x === toNode.x && edge.to.y === toNode.y) ||
        (edge.from.x === toNode.x && edge.from.y === toNode.y && edge.to.x === fromNode.x && edge.to.y === fromNode.y)
    ) ?? null
  );
}

describe('mapBoardView', () => {
  it('builds deterministic selected-edge and node emphasis state', () => {
    const state = buildRuntimeState();
    state.sim.vehicle.scanner = 2;
    const options = connectedNeighbors(state.sim);
    const selectedNodeId = options[0]?.nodeId;
    if (!selectedNodeId) throw new Error('Expected connected route option');

    state.sim.exploration.visitedNodeIds.push(selectedNodeId);
    state.completedNodeIds.push(selectedNodeId);
    state.expeditionGoalNodeId = selectedNodeId;

    const view = buildMapBoardView(state, 1280, 720, 110);

    expect(view.selectedNodeId).toBe(selectedNodeId);
    expect(view.nodes).toHaveLength(state.sim.world.nodes.length);
    expect(view.nodes.map((node) => node.depth)).toEqual([...view.nodes.map((node) => node.depth)].sort((a, b) => a - b));

    const selectedEdge = view.edges.find((edge) => edge.isSelected);
    expect(selectedEdge).toBeDefined();
    expect(selectedEdge?.color).toBe('#f59e0b');
    expect(selectedEdge?.width).toBeGreaterThan(2.9);

    const spineEdge = view.edges.find((edge) => !edge.isSelected && edge.color === '#cbd5e1');
    const branchEdge = view.edges.find((edge) => edge.color === '#7dd3fc');
    expect(spineEdge).toBeDefined();
    expect(branchEdge).toBeDefined();
    expect(spineEdge && branchEdge ? spineEdge.width > branchEdge.width : false).toBe(true);

    const currentNode = view.nodes.find((node) => node.current);
    expect(currentNode?.fill).toBe('#2563eb');
    expect(currentNode?.glowColor).toBe('#2563eb');

    const selectedNode = view.nodes.find((node) => node.selected);
    expect(selectedNode?.goal).toBe(true);
    expect(selectedNode?.outline).toBe(true);
    expect(selectedNode?.innerDot).toBe(true);
    expect(selectedNode?.bestLead).toBe(false);
    expect(selectedNode?.starRadius).toBeGreaterThan(0);
    expect(selectedNode?.intelMarkers).toHaveLength(1);
    expect(selectedNode?.intelMarkers[0]?.fill).toBe('#34d399');
    expect(selectedNode?.intelMarkers[0]?.subsystem).toBeNull();
  });

  it('writes scanner knowledge tiers back into node intel markers', () => {
    const state = buildRuntimeState();
    const candidate = state.sim.world.nodes.find((node) => node.id !== state.sim.currentNodeId);
    if (!candidate) throw new Error('Expected candidate node');
    candidate.type = 'anomaly';

    state.sim.vehicle.scanner = 1;
    let view = buildMapBoardView(state, 1280, 720, 110);
    let node = view.nodes.find((entry) => entry.id === candidate.id);
    expect(node?.intelMarkers).toHaveLength(0);

    state.sim.vehicle.scanner = 2;
    view = buildMapBoardView(state, 1280, 720, 110);
    node = view.nodes.find((entry) => entry.id === candidate.id);
    expect(node?.intelMarkers.map((marker) => marker.fill)).toEqual(['#34d399']);

    state.sim.vehicle.scanner = 3;
    view = buildMapBoardView(state, 1280, 720, 110);
    node = view.nodes.find((entry) => entry.id === candidate.id);
    expect(node?.intelMarkers.map((marker) => marker.fill)).toEqual(['#34d399', '#fbbf24']);

    state.sim.vehicle.scanner = 4;
    view = buildMapBoardView(state, 1280, 720, 110);
    node = view.nodes.find((entry) => entry.id === candidate.id);
    expect(node?.intelMarkers.map((marker) => marker.fill)).toEqual(['#34d399', '#fbbf24', '#a78bfa']);
    expect(node?.intelMarkers[2]?.subsystem).toBe('shielding');
  });

  it('marks unvisited connected routes that have deterministic first-arrival encounter payoffs', () => {
    const state = buildRuntimeState();
    state.sim.notebook.entries.push({
      id: 'clue-ruin',
      clueKey: 'ruin',
      sourceNodeType: 'ruin',
      sourceNodeId: 'n2',
      dayDiscovered: 1,
      title: 'Relay Masonry',
      body: 'Ruin clue body'
    });

    const destination = connectedNeighbors(state.sim)
      .map((neighbor) => state.sim.world.nodes.find((node) => node.id === neighbor.nodeId) ?? null)
      .find((node): node is NonNullable<typeof node> => node !== null);
    if (!destination) {
      throw new Error('Expected connected destination');
    }
    destination.type = 'town';

    let view = buildMapBoardView(state, 1280, 720, 110);
    let node = view.nodes.find((entry) => entry.id === destination.id);

    expect(node?.intelMarkers.map((marker) => marker.fill)).toContain('#f472b6');

    state.sim.exploration.visitedNodeIds.push(destination.id);
    view = buildMapBoardView(state, 1280, 720, 110);
    node = view.nodes.find((entry) => entry.id === destination.id);

    expect(node?.intelMarkers.map((marker) => marker.fill)).not.toContain('#f472b6');
  });

  it('marks synthesized strongest-lead neighbors directly on the board', () => {
    const state = buildRuntimeState();
    state.sim.notebook.discoveredClues.ruin = true;
    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;

    const options = connectedNeighbors(state.sim);
    const expectedBestLeadNodeIds = options
      .filter((option) => notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, option.nodeId).isBestLead)
      .map((option) => option.nodeId);

    const view = buildMapBoardView(state, 1280, 720, 110);
    const bestLeadNodes = view.nodes.filter((node) => node.bestLead);

    expect(expectedBestLeadNodeIds.length).toBeGreaterThan(0);
    expect(bestLeadNodes.map((node) => node.id).sort()).toEqual([...expectedBestLeadNodeIds].sort());
    expect(bestLeadNodes.every((node) => node.bestLeadRadius !== null && node.bestLeadRadius > node.radius)).toBe(true);
  });

  it('writes notebook signal-strength intel onto connected route edges before selection', () => {
    const state = buildRuntimeState();
    const routeCase = findRouteComparisonCase(state);
    state.sim.currentNodeId = routeCase.currentNodeId;
    state.sim.notebook.discoveredClues.ruin = true;
    const strongerSelectionIndex = connectedNeighbors(state.sim).findIndex((neighbor) => neighbor.nodeId === routeCase.holding.nodeId);
    state.mapSelectionIndex = strongerSelectionIndex >= 0 ? strongerSelectionIndex : 0;

    let view = buildMapBoardView(state, 1280, 720, 110);
    let strongerEdge = findEdge(view, routeCase.currentNodeId, routeCase.stronger.nodeId);
    let weakerEdge = findEdge(view, routeCase.currentNodeId, routeCase.weaker.nodeId);

    expect(strongerEdge?.color).toBe('#22c55e');
    expect(weakerEdge?.color).toBe('#fb7185');
    expect(strongerEdge && weakerEdge ? strongerEdge.width > weakerEdge.width : false).toBe(true);

    const weakerSelectionIndex = connectedNeighbors(state.sim).findIndex((neighbor) => neighbor.nodeId === routeCase.stronger.nodeId);
    state.mapSelectionIndex = weakerSelectionIndex >= 0 ? weakerSelectionIndex : 0;
    view = buildMapBoardView(state, 1280, 720, 110);
    const holdingEdge = findEdge(view, routeCase.currentNodeId, routeCase.holding.nodeId);

    expect(holdingEdge?.color).toBe('#f8fafc');

    state.sim.notebook.discoveredClues.nature = true;
    state.sim.notebook.discoveredClues.anomaly = true;
    state.sim.notebook.synthesisUnlocked = true;
    state.mapSelectionIndex = strongerSelectionIndex >= 0 ? strongerSelectionIndex : 0;
    view = buildMapBoardView(state, 1280, 720, 110);
    const bestLeadEdge = findEdge(view, routeCase.currentNodeId, routeCase.best.nodeId);

    expect(bestLeadEdge?.color).toBe('#22d3ee');
    expect(bestLeadEdge?.alpha).toBeGreaterThanOrEqual(0.86);
  });

  it('switches the final chip label when the expedition is complete', () => {
    const activeChips = buildMapActionChips(1280, 662, 34, false);
    const completedChips = buildMapActionChips(1280, 662, 34, true);

    expect(activeChips).toHaveLength(7);
    expect(activeChips[1]?.label).toBe('Left/Right\nSite');
    expect(activeChips[6]?.label).toBe('A\nReturn');
    expect(completedChips[6]?.label).toBe('N\nNew');
    expect(activeChips[0]?.x).toBeGreaterThanOrEqual(20);
    expect(activeChips[0]?.y).toBe(662);
    expect(activeChips[0]?.height).toBe(34);
    expect(activeChips[0]?.labelFill).toBe('#64748b');
  });

  it('compacts the centered chip row to stay within tighter map widths', () => {
    const chips = buildMapActionChips(560, 662, 34, false);

    expect(chips).toHaveLength(7);
    expect(chips[0]?.x).toBeGreaterThanOrEqual(20);
    expect(chips[1]?.x).toBeGreaterThan(chips[0]!.x + chips[0]!.w);
    expect(chips.at(-1)!.x + chips.at(-1)!.w).toBeLessThanOrEqual(540);
  });
});
