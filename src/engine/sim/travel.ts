import type { GameState } from '../../game/state/gameState';

export interface TravelResult {
  readonly didTravel: boolean;
  readonly fuelCost?: number;
  readonly reason?: string;
}

export interface TravelOptions {
  readonly ignoreFuelRequirement?: boolean;
}

export function travelToNode(state: GameState, destinationNodeId: string, options: TravelOptions = {}): TravelResult {
  if (!state.world.nodes.some((node) => node.id === destinationNodeId)) {
    return {
      didTravel: false,
      reason: `Unknown node: ${destinationNodeId}`
    };
  }

  if (destinationNodeId === state.currentNodeId) {
    return {
      didTravel: false,
      reason: 'Already at destination node'
    };
  }

  const validEdge = state.world.edges.find(
    (edge) =>
      (edge.from === state.currentNodeId && edge.to === destinationNodeId) ||
      (edge.to === state.currentNodeId && edge.from === destinationNodeId)
  );
  if (!validEdge) {
    return {
      didTravel: false,
      reason: `No route from ${state.currentNodeId} to ${destinationNodeId}`
    };
  }

  const fuelCost = Math.max(1, validEdge.distance);
  if (!options.ignoreFuelRequirement && state.fuel < fuelCost) {
    return {
      didTravel: false,
      reason: `Not enough fuel: need ${fuelCost}, have ${state.fuel}`
    };
  }

  state.currentNodeId = destinationNodeId;
  state.day += 1;
  state.fuel -= fuelCost;

  return { didTravel: true, fuelCost };
}
