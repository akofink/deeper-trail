import { connectedNeighbors } from '../../engine/sim/world';
import { asNodeTypeKey, biomeRiskDescriptor, visibleBiomeKnowledge } from '../../engine/sim/exploration';
import { notebookSignalRouteIntel } from '../../engine/sim/notebook';
import { mapNodePalette } from './runLayout';
import type { RuntimeState } from './runtimeState';
import { projectMapPoint } from './mapProjection';
import { buildSceneActionChipRow, type SceneActionChip } from './sceneActionChips';
import { previewArrivalEncounter } from './arrivalEncounters';

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
  bestLead: boolean;
  bestLeadRadius: number | null;
  fill: string;
  glowColor: string | null;
  glowRadius: number | null;
  goal: boolean;
  id: string;
  innerDot: boolean;
  outline: boolean;
  paletteLabel: string;
  radius: number;
  selected: boolean;
  starRadius: number | null;
  intelMarkers: MapBoardNodeIntelMarker[];
  visited: boolean;
  x: number;
  y: number;
}

export interface MapBoardNodeIntelMarker {
  fill: string;
  radius: number;
  subsystem: string | null;
  xOffset: number;
  yOffset: number;
}

export interface MapBoardView {
  edges: MapBoardEdgeView[];
  nodes: MapBoardNodeView[];
  selectedNodeId: string | null;
}

function signalEdgeStyle(
  state: RuntimeState,
  selectedNodeId: string
): {
  alpha: number;
  color: string;
  widthBoost: number;
} | null {
  const signalIntel = notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, selectedNodeId);
  if (!signalIntel.routeHint) {
    return null;
  }

  if (signalIntel.isBestLead) {
    return {
      alpha: 0.86,
      color: '#22d3ee',
      widthBoost: 1.2
    };
  }

  if (signalIntel.routeHint.includes('strengthens')) {
    return {
      alpha: 0.8,
      color: '#22c55e',
      widthBoost: 0.85
    };
  }

  if (signalIntel.routeHint.includes('weakens')) {
    return {
      alpha: 0.72,
      color: '#fb7185',
      widthBoost: 0.4
    };
  }

  return {
    alpha: 0.74,
    color: '#f8fafc',
    widthBoost: 0.55
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildNodeIntelMarkers(
  radius: number,
  nodeId: string,
  nodeType: string,
  state: RuntimeState,
  options: {
    connectedNodeIds: ReadonlySet<string>;
    bestLeadNodeIds: ReadonlySet<string>;
  }
): MapBoardNodeIntelMarker[] {
  const knowledge = visibleBiomeKnowledge(state.sim, nodeType);
  const orbit = radius + 5;
  const markerRadius = Math.max(2.5, Math.min(4.5, radius * 0.28));
  const markers: MapBoardNodeIntelMarker[] = [];
  const isConnected = options.connectedNodeIds.has(nodeId);
  const firstVisit = !state.sim.exploration.visitedNodeIds.includes(nodeId);
  const arrivalEncounter =
    isConnected && firstVisit
      ? previewArrivalEncounter(state, asNodeTypeKey(nodeType), true, {
          arrivedViaBestLeadRoute: options.bestLeadNodeIds.has(nodeId)
        })
      : null;

  if (knowledge.benefitKnown) {
    markers.push({ fill: '#34d399', radius: markerRadius, subsystem: null, xOffset: -orbit * 0.72, yOffset: -orbit * 0.68 });
  }
  if (knowledge.objectiveKnown) {
    markers.push({ fill: '#fbbf24', radius: markerRadius, subsystem: null, xOffset: orbit * 0.72, yOffset: -orbit * 0.68 });
  }
  if (knowledge.riskKnown) {
    const risk = biomeRiskDescriptor(nodeType as Parameters<typeof biomeRiskDescriptor>[0]);
    markers.push({ fill: risk.markerColor, radius: markerRadius, subsystem: risk.subsystem, xOffset: 0, yOffset: orbit * 0.9 });
  }
  if (arrivalEncounter?.summary) {
    markers.push({ fill: '#f472b6', radius: markerRadius, subsystem: null, xOffset: orbit * 0.86, yOffset: orbit * 0.3 });
  }

  return markers;
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
  const connectedNodeIds = new Set(options.map((option) => option.nodeId));
  const signalEdgeStyles = new Map(options.map((option) => [option.nodeId, signalEdgeStyle(state, option.nodeId)] as const));
  const bestLeadNodeIds = new Set(
    options
      .filter((option) => notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, option.nodeId).isBestLead)
      .map((option) => option.nodeId)
  );

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
    const neighborNodeId =
      edge.from === state.sim.currentNodeId ? edge.to : edge.to === state.sim.currentNodeId ? edge.from : null;
    const signalStyle = neighborNodeId ? signalEdgeStyles.get(neighborNodeId) ?? null : null;
    const depthAlpha = clamp(0.52 + (fromPoint.depth + toPoint.depth) * 0.00035, 0.34, 0.78);
    const kindWidthBoost = edge.kind === 'spine' ? 1.1 : edge.kind === 'crosslink' ? 0.35 : 0;
    const kindAlphaBoost = edge.kind === 'spine' ? 0.16 : edge.kind === 'crosslink' ? -0.08 : 0;
    const edgeColor = edge.kind === 'spine' ? '#cbd5e1' : edge.kind === 'crosslink' ? '#64748b' : '#7dd3fc';
    const styledEdge = !isSelected && signalStyle;

    return [
      {
        alpha: isSelected ? 0.95 : styledEdge ? Math.max(clamp(depthAlpha + kindAlphaBoost, 0.28, 0.88), signalStyle.alpha) : clamp(depthAlpha + kindAlphaBoost, 0.28, 0.88),
        color: isSelected ? '#f59e0b' : styledEdge ? signalStyle.color : edgeColor,
        from: fromPoint,
        isSelected,
        to: toPoint,
        width: isSelected ? baseWidth + 1.5 : baseWidth + kindWidthBoost + (styledEdge ? signalStyle.widthBoost : 0)
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
      const bestLead = bestLeadNodeIds.has(node.id);

      return {
        bestLead,
        bestLeadRadius: bestLead ? radius + 6 : null,
        completed,
        current,
        depth: projected.depth,
        fill: current ? '#2563eb' : selected ? '#f97316' : palette.fill,
        glowColor: visited || current || selected ? (current ? '#2563eb' : palette.glow) : null,
        glowRadius: visited || current || selected ? radius + 8 : null,
        goal,
        id: node.id,
        innerDot: visited && !current,
        intelMarkers: buildNodeIntelMarkers(radius, node.id, node.type, state, { connectedNodeIds, bestLeadNodeIds }),
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
      { width: 92, minWidth: 72, color: '#60a5fa', label: 'Up/Down\nRoute', labelFill: '#64748b' },
      { width: 86, minWidth: 68, color: '#38bdf8', label: 'Left/Right\nSite', labelFill: '#64748b' },
      { width: 82, minWidth: 64, color: '#7dd3fc', label: 'Q/E\nRotate', labelFill: '#64748b' },
      { width: 82, minWidth: 64, color: '#fbbf24', label: 'Enter\nTravel', labelFill: '#64748b' },
      { width: 82, minWidth: 64, color: '#34d399', label: 'B\nRepair', labelFill: '#64748b' },
      { width: 82, minWidth: 64, color: '#94a3b8', label: 'C\nInstall', labelFill: '#64748b' },
      {
        width: 82,
        minWidth: 64,
        color: '#64748b',
        label: expeditionComplete ? 'N\nNew' : 'A\nReturn',
        labelFill: '#64748b'
      }
    ],
    { align: 'center', gap: 10, leftInset: 20, rightInset: 20, minGap: 6 }
  );
}
