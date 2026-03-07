import { describe, expect, it } from 'vitest';
import { generateWorldGraph } from '../src/engine/gen/worldGraph';

describe('generateWorldGraph', () => {
  it('is deterministic for identical seed and size', () => {
    const first = generateWorldGraph('w-42', 6);
    const second = generateWorldGraph('w-42', 6);

    expect(first).toEqual(second);
  });

  it('builds a connected baseline path', () => {
    const graph = generateWorldGraph('w-42', 6);

    expect(graph.edges).toHaveLength(5);
    expect(graph.edges[0]).toMatchObject({ from: 'n0', to: 'n1' });
    expect(graph.edges[4]).toMatchObject({ from: 'n4', to: 'n5' });
  });

  it('creates a clustered point cloud with spread on both axes', () => {
    const graph = generateWorldGraph('cloud-test', 12);
    const xs = graph.nodes.map((node) => node.x);
    const ys = graph.nodes.map((node) => node.y);
    const zs = graph.nodes.map((node) => node.z);
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const ySpan = Math.max(...ys) - Math.min(...ys);
    const zSpan = Math.max(...zs) - Math.min(...zs);

    expect(xSpan).toBeGreaterThan(350);
    expect(ySpan).toBeGreaterThan(220);
    expect(zSpan).toBeGreaterThan(260);

    const quadrants = new Set(
      graph.nodes.map((node) => `${node.x > 500 ? 'R' : 'L'}${node.y > 350 ? 'B' : 'T'}`)
    );
    expect(quadrants.size).toBeGreaterThanOrEqual(3);
  });
});
