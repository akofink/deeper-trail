import type { SeededRng } from '../rng/seededRng';
import { createSeededRng } from '../rng/seededRng';

export type NodeType = 'town' | 'ruin' | 'nature' | 'anomaly';

export interface WorldNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  z: number;
}

export interface WorldEdge {
  from: string;
  to: string;
  distance: number;
}

export interface WorldGraph {
  nodes: WorldNode[];
  edges: WorldEdge[];
}

const NODE_TYPES: NodeType[] = ['town', 'ruin', 'nature', 'anomaly'];

function pickNodeType(rng: SeededRng): NodeType {
  return NODE_TYPES[rng.nextInt(NODE_TYPES.length)];
}

function distanceFromCoordinates(a: WorldNode, b: WorldNode): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const euclidean = Math.hypot(dx, dy, dz);
  return Math.max(1, Math.min(20, Math.round(euclidean / 60)));
}

function generateClusterCenters(rng: SeededRng, clusterCount: number): Array<{ x: number; y: number; z: number }> {
  const centers: Array<{ x: number; y: number; z: number }> = [];
  const baseX = 500;
  const baseY = 350;
  const baseZ = 0;
  const radiusX = 260;
  const radiusY = 180;
  const radiusZ = 220;
  const angleOffset = rng.nextRange(0, Math.PI * 2);

  for (let i = 0; i < clusterCount; i += 1) {
    const angle = angleOffset + (i / clusterCount) * Math.PI * 2;
    centers.push({
      x: baseX + Math.cos(angle) * (radiusX + rng.nextRange(-70, 90)),
      y: baseY + Math.sin(angle) * (radiusY + rng.nextRange(-60, 80)),
      z: baseZ + Math.sin(angle * 1.7) * (radiusZ + rng.nextRange(-90, 110))
    });
  }

  return centers;
}

function generateNodePoint(
  rng: SeededRng,
  center: { x: number; y: number; z: number },
  index: number
): { x: number; y: number; z: number } {
  const angle = rng.nextRange(0, Math.PI * 2);
  const radius = 55 + (index % 3) * 26 + rng.nextRange(-18, 42);
  const skew = 0.68 + (index % 4) * 0.09;
  const depthSkew = 0.74 + (index % 5) * 0.08;
  return {
    x: Math.round(Math.max(40, Math.min(960, center.x + Math.cos(angle) * radius * (1.15 + rng.nextRange(-0.18, 0.22))))),
    y: Math.round(Math.max(40, Math.min(660, center.y + Math.sin(angle) * radius * skew + rng.nextRange(-26, 26)))),
    z: Math.round(Math.max(-420, Math.min(420, center.z + Math.cos(angle * 1.37) * radius * depthSkew + rng.nextRange(-42, 42))))
  };
}

export function generateWorldGraph(seed: string, nodeCount = 12): WorldGraph {
  if (!Number.isInteger(nodeCount) || nodeCount < 3) {
    throw new Error('nodeCount must be an integer >= 3');
  }

  const rng = createSeededRng(seed);
  const nodes: WorldNode[] = [];
  const edges: WorldEdge[] = [];
  const clusterCount = Math.max(3, Math.min(5, Math.round(nodeCount / 4)));
  const centers = generateClusterCenters(rng, clusterCount);

  for (let i = 0; i < nodeCount; i += 1) {
    const center = centers[i % clusterCount] ?? centers[0] ?? { x: 500, y: 350, z: 0 };
    const point = generateNodePoint(rng, center, i);
    nodes.push({
      id: `n${i}`,
      type: pickNodeType(rng),
      x: point.x,
      y: point.y,
      z: point.z
    });

    // Keep a connected baseline by linking each new node to the previous one.
    if (i > 0) {
      const previous = nodes[i - 1];
      const current = nodes[i];
      if (!previous || !current) {
        throw new Error('Expected nodes for connected edge generation');
      }
      const from = previous.id;
      const to = current.id;
      const distance = distanceFromCoordinates(previous, current);
      edges.push({ from, to, distance });
    }
  }

  return { nodes, edges };
}
