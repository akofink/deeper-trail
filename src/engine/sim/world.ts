import type { GameState } from '../../game/state/gameState';

export function connectedNeighbors(state: GameState): Array<{ nodeId: string; distance: number }> {
  const sourceId = state.currentNodeId;
  return state.world.edges
    .filter((edge) => edge.from === sourceId || edge.to === sourceId)
    .map((edge) => ({
      nodeId: edge.from === sourceId ? edge.to : edge.from,
      distance: edge.distance
    }));
}

export function findNode(state: GameState, nodeId: string): (typeof state.world.nodes)[number] | undefined {
  return state.world.nodes.find((node) => String(node.id) === String(nodeId));
}

export function shortestLegCountBetweenNodes(state: GameState, fromNodeId: string, toNodeId: string): number | null {
  if (fromNodeId === toNodeId) {
    return 0;
  }

  const queue: Array<{ nodeId: string; legs: number }> = [{ nodeId: fromNodeId, legs: 0 }];
  const visited = new Set<string>([fromNodeId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const neighbors = state.world.edges.flatMap((edge) => {
      if (edge.from === current.nodeId) return [edge.to];
      if (edge.to === current.nodeId) return [edge.from];
      return [];
    });

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }
      if (neighborId === toNodeId) {
        return current.legs + 1;
      }
      visited.add(neighborId);
      queue.push({ nodeId: neighborId, legs: current.legs + 1 });
    }
  }

  return null;
}

export function currentNodeType(state: GameState): string {
  return findNode(state, state.currentNodeId)?.type ?? 'town';
}

export function expeditionGoalNodeId(state: GameState): string {
  const startId = state.currentNodeId;
  let selected = state.world.nodes.find((node) => node.id !== startId) ?? state.world.nodes[0];
  if (!selected) {
    throw new Error('Expected at least one node for expedition goal');
  }

  for (const node of state.world.nodes) {
    if (node.id === startId) continue;
    if (node.x + node.z * 0.35 > selected.x + selected.z * 0.35 || (node.x === selected.x && node.y < selected.y)) {
      selected = node;
    }
  }

  return selected.id;
}
