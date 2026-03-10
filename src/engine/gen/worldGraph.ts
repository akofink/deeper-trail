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
  kind: 'spine' | 'branch' | 'crosslink';
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

function legacyNodeTypes(seed: string, nodeCount: number): NodeType[] {
  const rng = createSeededRng(seed);
  const clusterCount = Math.max(3, Math.min(5, Math.round(nodeCount / 4)));
  const types: NodeType[] = [];

  rng.nextRange(0, Math.PI * 2);
  for (let i = 0; i < clusterCount; i += 1) {
    rng.nextRange(-70, 90);
    rng.nextRange(-60, 80);
    rng.nextRange(-90, 110);
  }

  for (let i = 0; i < nodeCount; i += 1) {
    rng.nextRange(0, Math.PI * 2);
    rng.nextRange(-18, 42);
    rng.nextRange(-0.18, 0.22);
    rng.nextRange(-26, 26);
    rng.nextRange(-42, 42);
    types.push(pickNodeType(rng));
  }

  return types;
}

function distanceFromCoordinates(a: WorldNode, b: WorldNode): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const euclidean = Math.hypot(dx, dy, dz);
  return Math.max(1, Math.min(20, Math.round(euclidean / 60)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function branchAnchorIndices(spineCount: number): number[] {
  if (spineCount <= 2) {
    return [0];
  }
  if (spineCount === 3) {
    return [1];
  }

  const anchors: number[] = [];
  for (let i = 1; i < spineCount - 1; i += 1) {
    anchors.push(i);
  }
  return anchors;
}

function generateSpinePoint(
  rng: SeededRng,
  index: number,
  spineCount: number
): { x: number; y: number; z: number } {
  const progress = spineCount === 1 ? 0 : index / (spineCount - 1);
  const laneBias = index % 2 === 0 ? -1 : 1;
  return {
    x: Math.round(120 + progress * 760 + rng.nextRange(-20, 20)),
    y: Math.round(
      clamp(
        340 + Math.sin(progress * Math.PI * 1.25 + rng.nextRange(-0.14, 0.14)) * 92 + laneBias * 26 + rng.nextRange(-22, 22),
        120,
        580
      )
    ),
    z: Math.round(clamp(Math.cos(progress * Math.PI * 1.6 + rng.nextRange(-0.2, 0.2)) * 210 + rng.nextRange(-60, 60), -360, 360))
  };
}

function generateBranchPoint(
  rng: SeededRng,
  anchor: WorldNode,
  anchorIndex: number,
  branchIndex: number
): { x: number; y: number; z: number } {
  const branchSide = (anchorIndex + branchIndex) % 2 === 0 ? -1 : 1;
  const xOffset = 50 + (branchIndex % 3) * 18 + rng.nextRange(-10, 16);
  const yOffset = 70 + (anchorIndex % 3) * 24 + rng.nextRange(-18, 24);
  const zOffset = 95 + (branchIndex % 4) * 24 + rng.nextRange(-20, 28);

  return {
    x: Math.round(clamp(anchor.x + xOffset + rng.nextRange(-18, 18), 60, 940)),
    y: Math.round(clamp(anchor.y + branchSide * yOffset, 70, 630)),
    z: Math.round(clamp(anchor.z + branchSide * zOffset + rng.nextRange(-28, 28), -410, 410))
  };
}

function edgeDistance(nodes: WorldNode[], fromIndex: number, toIndex: number): number {
  const from = nodes[fromIndex];
  const to = nodes[toIndex];
  if (!from || !to) {
    throw new Error('Expected nodes for edge distance');
  }
  return distanceFromCoordinates(from, to);
}

export function generateWorldGraph(seed: string, nodeCount = 12): WorldGraph {
  if (!Number.isInteger(nodeCount) || nodeCount < 3) {
    throw new Error('nodeCount must be an integer >= 3');
  }

  const rng = createSeededRng(seed);
  const nodes: WorldNode[] = [];
  const edges: WorldEdge[] = [];
  const nodeTypes = legacyNodeTypes(seed, nodeCount);
  const spineCount = clamp(Math.round(nodeCount * 0.58), 3, nodeCount);

  for (let i = 0; i < spineCount; i += 1) {
    const point = generateSpinePoint(rng, i, spineCount);
    nodes.push({ id: `n${i}`, type: i === 0 ? 'town' : (nodeTypes[i] ?? 'town'), x: point.x, y: point.y, z: point.z });
    if (i > 0) {
      edges.push({
        from: `n${i - 1}`,
        kind: 'spine',
        to: `n${i}`,
        distance: edgeDistance(nodes, i - 1, i)
      });
    }
  }

  const anchors = branchAnchorIndices(spineCount);
  for (let i = spineCount; i < nodeCount; i += 1) {
    const anchorIndex = anchors[(i - spineCount) % anchors.length] ?? spineCount - 1;
    const anchor = nodes[anchorIndex];
    if (!anchor) {
      throw new Error('Expected anchor node for branch generation');
    }

    const point = generateBranchPoint(rng, anchor, anchorIndex, i - spineCount);
    nodes.push({ id: `n${i}`, type: nodeTypes[i] ?? 'town', x: point.x, y: point.y, z: point.z });
    edges.push({
      from: anchor.id,
      kind: 'branch',
      to: `n${i}`,
      distance: edgeDistance(nodes, anchorIndex, i)
    });
  }

  const crosslinkAttempts = Math.min(2, Math.max(0, Math.floor((nodeCount - 7) / 3)));
  for (let i = 0; i < crosslinkAttempts; i += 1) {
    if (rng.next() < 0.35) {
      continue;
    }

    const fromIndex = 1 + i;
    const toIndex = Math.min(spineCount - 1, fromIndex + 2 + rng.nextInt(Math.max(1, spineCount - fromIndex - 1)));
    if (toIndex - fromIndex < 2) {
      continue;
    }

    edges.push({
      from: `n${fromIndex}`,
      kind: 'crosslink',
      to: `n${toIndex}`,
      distance: edgeDistance(nodes, fromIndex, toIndex)
    });
  }

  return { nodes, edges };
}
