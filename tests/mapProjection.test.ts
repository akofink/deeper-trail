import { describe, expect, it } from 'vitest';
import { generateWorldGraph } from '../src/engine/gen/worldGraph';
import { projectMapPoint } from '../src/game/runtime/mapProjection';

describe('mapProjection', () => {
  it('keeps deterministic world graphs spread across both screen axes under unrestricted rotation', () => {
    const graph = generateWorldGraph('cloud-test', 12);
    const bounds = {
      minX: Math.min(...graph.nodes.map((node) => node.x)),
      maxX: Math.max(...graph.nodes.map((node) => node.x)),
      minY: Math.min(...graph.nodes.map((node) => node.y)),
      maxY: Math.max(...graph.nodes.map((node) => node.y)),
      minZ: Math.min(...graph.nodes.map((node) => node.z)),
      maxZ: Math.max(...graph.nodes.map((node) => node.z))
    };

    const projected = graph.nodes.map((node) => projectMapPoint(node.x, node.y, node.z, bounds, 1280, 720, 110, 10));
    const xSpan = Math.max(...projected.map((node) => node.x)) - Math.min(...projected.map((node) => node.x));
    const ySpan = Math.max(...projected.map((node) => node.y)) - Math.min(...projected.map((node) => node.y));

    expect(xSpan).toBeGreaterThan(250);
    expect(ySpan).toBeGreaterThan(120);
  });
});
