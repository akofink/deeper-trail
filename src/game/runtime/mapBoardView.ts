import { connectedNeighbors } from '../../engine/sim/world';
import { mapNodePalette } from './runLayout';
import type { RuntimeState } from './runtimeState';
import { projectMapPoint } from './mapProjection';
import { buildSceneActionChipRow, type SceneActionChip } from './sceneActionChips';

export interface MapBoardPoint {
  x: number;
  y: number;
  depth: number;
}

export interface MapBoardEdgeView {
  alpha: number;
  color: string;
  from: MapBoardPoint;
  isSelected: boolean;
  to: MapBoardPoint;
  width: number;
}

export interface MapBoardNodeView {
  completed: boolean;
  current: boolean;
  depth: number;
  fill: string;
  glowColor: string | null;
  glowRadius: number | null;
  goal: boolean;
  innerDot: boolean;
  outline: boolean;
  paletteLabel: string;
  radius: number;
  selected: boolean;
  starRadius: number | null;
  visited: boolean;
  x: number;
  y: number;
}

export interface MapBoardView {
  edges: MapBoardEdgeView[];
  nodes: MapBoardNodeView[];
  selectedNodeId: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildMapBoardView(
  state: RuntimeState,
  screenWidth: number,
  screenHeight: number,
  margin: number
): MapBoardView {
  const minX = Math.min(...state.sim.world.nodes.map((node) => node.x));
  const maxX = Math.max(...state.sim.world.nodes.map((node) => node.x));
  const minY = Math.min(...state.sim.world.nodes.map((node) => node.y));
  const maxY = Math.max(...state.sim.world.nodes.map((node) => node.y));
  const minZ = Math.min(...state.sim.world.nodes.map((node) => node.z));
  const maxZ = Math.max(...state.sim.world.nodes.map((node) => node.z));
  const bounds = { minX, maxX, minY, maxY, minZ, maxZ };
  const project = (x: number, y: number, z: number): MapBoardPoint =>
    projectMapPoint(x, y, z, bounds, screenWidth, screenHeight, margin, state.mapRotation);

  const options = connectedNeighbors(state.sim);
  const selectedOption = options[state.mapSelectionIndex] ?? null;
  const selectedNodeId = selectedOption?.nodeId ?? null;
  const nodeById = new Map(state.sim.world.nodes.map((node) => [node.id, node] as const));

  const edges = state.sim.world.edges.flatMap((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return [];
    const fromPoint = project(from.x, from.y, from.z);
    const toPoint = project(to.x, to.y, to.z);
    const baseWidth = clamp(1.5 + edge.distance * 0.12, 1.5, 4);
    const isSelected =
      (edge.from === state.sim.currentNodeId && edge.to === selectedNodeId) ||
      (edge.to === state.sim.currentNodeId && edge.from === selectedNodeId);
    const depthAlpha = clamp(0.52 + (fromPoint.depth + toPoint.depth) * 0.00035, 0.34, 0.78);
    const kindWidthBoost = edge.kind === 'spine' ? 1.1 : edge.kind === 'crosslink' ? 0.35 : 0;
    const kindAlphaBoost = edge.kind === 'spine' ? 0.16 : edge.kind === 'crosslink' ? -0.08 : 0;
    const edgeColor = edge.kind === 'spine' ? '#cbd5e1' : edge.kind === 'crosslink' ? '#64748b' : '#7dd3fc';

    return [
      {
        alpha: isSelected ? 0.95 : clamp(depthAlpha + kindAlphaBoost, 0.28, 0.88),
        color: isSelected ? '#f59e0b' : edgeColor,
        from: fromPoint,
        isSelected,
        to: toPoint,
        width: isSelected ? baseWidth + 1.5 : baseWidth + kindWidthBoost
      }
    ];
  });

  const nodes = state.sim.world.nodes
    .map((node) => {
      const projected = project(node.x, node.y, node.z);
      const current = node.id === state.sim.currentNodeId;
      const selected = node.id === selectedNodeId;
      const visited = state.sim.exploration.visitedNodeIds.includes(node.id);
      const completed = state.completedNodeIds.includes(node.id);
      const goal = node.id === state.expeditionGoalNodeId;
      const palette = mapNodePalette(node.type);
      const radius = (current ? 14 : selected ? 12 : 10) + clamp(projected.depth / 420, -1.5, 1.5);

      return {
        completed,
        current,
        depth: projected.depth,
        fill: current ? '#2563eb' : selected ? '#f97316' : palette.fill,
        glowColor: visited || current || selected ? (current ? '#2563eb' : palette.glow) : null,
        glowRadius: visited || current || selected ? radius + 8 : null,
        goal,
        innerDot: visited && !current,
        outline: completed,
        paletteLabel: palette.label,
        radius,
        selected,
        starRadius: goal ? radius + 6 : null,
        visited,
        x: projected.x,
        y: projected.y
      };
    })
    .sort((a, b) => a.depth - b.depth);

  return { edges, nodes, selectedNodeId };
}

export function buildMapActionChips(
  screenWidth: number,
  chipY: number,
  chipHeight: number,
  expeditionComplete: boolean
): SceneActionChip[] {
  return buildSceneActionChipRow(
    screenWidth,
    chipY,
    chipHeight,
    [
      { width: 98, minWidth: 80, color: '#60a5fa', label: 'Up/Down\nRoute', labelFill: '#64748b' },
      { width: 88, minWidth: 72, color: '#7dd3fc', label: 'Q/E\nRotate', labelFill: '#64748b' },
      { width: 88, minWidth: 72, color: '#fbbf24', label: 'Enter\nTravel', labelFill: '#64748b' },
      { width: 88, minWidth: 72, color: '#34d399', label: 'B\nRepair', labelFill: '#64748b' },
      { width: 88, minWidth: 72, color: '#94a3b8', label: 'C\nInstall', labelFill: '#64748b' },
      {
        width: 88,
        minWidth: 72,
        color: '#64748b',
        label: expeditionComplete ? 'N\nNew' : 'A\nReturn',
        labelFill: '#64748b'
      }
    ],
    { align: 'center', gap: 10, leftInset: 20, rightInset: 20, minGap: 6 }
  );
}
