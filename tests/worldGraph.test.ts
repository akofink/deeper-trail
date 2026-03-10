import { describe, expect, it } from 'vitest';
import { generateWorldGraph } from '../src/engine/gen/worldGraph';

describe('generateWorldGraph', () => {
  it('is deterministic for identical seed and size', () => {
    const first = generateWorldGraph('w-42', 6);
    const second = generateWorldGraph('w-42', 6);

    expect(first).toEqual(second);
  });

  it('builds a connected route spine with attached branch nodes', () => {
    const graph = generateWorldGraph('w-42', 12);
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const visited = new Set<string>(['n0']);
    const queue = ['n0'];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      for (const edge of graph.edges) {
        const neighbor = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
        if (!neighbor || visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    const spineEdges = graph.edges.filter((edge) => edge.kind === 'spine');
    const branchEdges = graph.edges.filter((edge) => edge.kind === 'branch');
    const degrees = new Map<string, number>();
    for (const edge of graph.edges) {
      degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
      degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
    }

    expect(visited).toEqual(nodeIds);
    expect(spineEdges.length).toBeGreaterThanOrEqual(2);
    expect(spineEdges[0]).toMatchObject({ from: 'n0', to: 'n1' });
    expect(branchEdges.length).toBeGreaterThanOrEqual(3);
    expect([...degrees.values()].some((degree) => degree >= 3)).toBe(true);
    expect([...degrees.values()].some((degree) => degree === 1)).toBe(true);
  });

  it('creates a route-board layout with strong forward spread and district offset', () => {
    const graph = generateWorldGraph('cloud-test', 12);
    const xs = graph.nodes.map((node) => node.x);
    const ys = graph.nodes.map((node) => node.y);
    const zs = graph.nodes.map((node) => node.z);
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const ySpan = Math.max(...ys) - Math.min(...ys);
    const zSpan = Math.max(...zs) - Math.min(...zs);

    expect(xSpan).toBeGreaterThan(620);
    expect(ySpan).toBeGreaterThan(180);
    expect(zSpan).toBeGreaterThan(260);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(60);
    expect(Math.max(...xs)).toBeLessThanOrEqual(940);
  });
});
