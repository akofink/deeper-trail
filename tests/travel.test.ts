import { describe, expect, it } from 'vitest';
import { travelToNode } from '../src/engine/sim/travel';
import { createInitialGameState } from '../src/game/state/gameState';

describe('travelToNode', () => {
  it('moves the player, advances day, and consumes fuel for connected nodes', () => {
    const state = createInitialGameState('seed-travel');
    const destination = state.world.nodes[1]?.id;

    expect(destination).toBeDefined();
    expect(state.currentNodeId).toBe('n0');
    const edge = state.world.edges.find((item) => item.from === 'n0' && item.to === destination);
    expect(edge).toBeDefined();
    const beforeFuel = state.fuel;

    const result = travelToNode(state, destination as string);

    expect(result.didTravel).toBe(true);
    expect(result.fuelCost).toBe(edge?.distance);
    expect(state.currentNodeId).toBe(destination);
    expect(state.day).toBe(1);
    expect(state.fuel).toBe(beforeFuel - (edge?.distance ?? 0));
  });

  it('rejects unknown node ids without mutating day', () => {
    const state = createInitialGameState('seed-travel');

    const result = travelToNode(state, 'n999');

    expect(result.didTravel).toBe(false);
    expect(result.reason).toContain('Unknown node');
    expect(state.day).toBe(0);
  });

  it('rejects non-adjacent nodes', () => {
    const state = createInitialGameState('seed-travel');

    const result = travelToNode(state, 'n5');

    expect(result.didTravel).toBe(false);
    expect(result.reason).toContain('No route');
    expect(state.currentNodeId).toBe('n0');
    expect(state.day).toBe(0);
  });

  it('rejects travel when fuel is insufficient', () => {
    const state = createInitialGameState('seed-travel');
    const destination = state.world.nodes[1]?.id as string;
    const edge = state.world.edges.find((item) => item.from === 'n0' && item.to === destination);
    expect(edge).toBeDefined();
    state.fuel = (edge?.distance ?? 1) - 1;

    const result = travelToNode(state, destination);

    expect(result.didTravel).toBe(false);
    expect(result.reason).toContain('Not enough fuel');
    expect(state.currentNodeId).toBe('n0');
    expect(state.day).toBe(0);
  });
});
