import type { Beacon, ServiceStop } from '../state/runObjectives';
import type { Collectible, Hazard } from './runtimeState';

export const MODULE_LABELS = ['FRAME', 'ENGINE', 'SCAN', 'SUSP', 'STORE', 'SHIELD'] as const;

export function biomeByNodeType(nodeType: string): { sky: string; back: string; ground: string; hazard: string; collectible: string } {
  if (nodeType === 'ruin') {
    return { sky: '#ffd7a8', back: '#f7e9d2', ground: '#8b6e42', hazard: '#7f1d1d', collectible: '#fb923c' };
  }
  if (nodeType === 'nature') {
    return { sky: '#9fe7d8', back: '#d9f6ef', ground: '#3a7d44', hazard: '#166534', collectible: '#facc15' };
  }
  if (nodeType === 'anomaly') {
    return { sky: '#c5b7ff', back: '#ece6ff', ground: '#5b46a8', hazard: '#4c1d95', collectible: '#22d3ee' };
  }
  return { sky: '#8fd3ff', back: '#d8f0ff', ground: '#4b8b3b', hazard: '#991b1b', collectible: '#ffd43b' };
}

export function mapNodePalette(nodeType: string): { fill: string; glow: string; label: string } {
  if (nodeType === 'ruin') {
    return { fill: '#c2410c', glow: '#fed7aa', label: 'RUIN' };
  }
  if (nodeType === 'nature') {
    return { fill: '#15803d', glow: '#bbf7d0', label: 'NATURE' };
  }
  if (nodeType === 'anomaly') {
    return { fill: '#6d28d9', glow: '#ddd6fe', label: 'ANOM' };
  }
  return { fill: '#0f766e', glow: '#99f6e4', label: 'TOWN' };
}

export function buildRunLayout(groundY: number, nodeType: string): {
  goalX: number;
  hazards: Hazard[];
  collectibles: Collectible[];
  beacons: Beacon[];
  serviceStops: ServiceStop[];
} {
  const hazardPattern =
    nodeType === 'anomaly'
      ? [
          { x: 450, w: 72 },
          { x: 790, w: 86 },
          { x: 1140, w: 78 },
          { x: 1490, w: 90 },
          { x: 1840, w: 84 },
          { x: 2190, w: 76 }
        ]
      : nodeType === 'ruin'
        ? [
            { x: 420, w: 68 },
            { x: 740, w: 82 },
            { x: 1080, w: 88 },
            { x: 1420, w: 74 },
            { x: 1760, w: 86 },
            { x: 2100, w: 80 }
          ]
        : nodeType === 'nature'
          ? [
              { x: 430, w: 60 },
              { x: 760, w: 70 },
              { x: 1090, w: 66 },
              { x: 1420, w: 74 },
              { x: 1750, w: 68 },
              { x: 2080, w: 72 }
            ]
          : [
              { x: 440, w: 70 },
              { x: 770, w: 84 },
              { x: 1110, w: 78 },
              { x: 1450, w: 88 },
              { x: 1790, w: 82 },
              { x: 2130, w: 76 }
            ];

  const collectibleHeights =
    nodeType === 'anomaly'
      ? [76, 88, 82, 94, 86, 90]
      : nodeType === 'ruin'
        ? [70, 84, 78, 90, 82, 86]
        : nodeType === 'nature'
          ? [64, 72, 68, 80, 74, 76]
          : [66, 82, 74, 88, 78, 84];

  return {
    goalX: 2450,
    hazards: hazardPattern.map((hazard, i) => ({
      kind: i % 2 === 0 ? 'moving' : 'static',
      x: hazard.x,
      baseX: hazard.x,
      y: groundY - 16,
      w: hazard.w,
      h: 16,
      amplitude: i % 2 === 0 ? 34 : 0,
      speed: i % 2 === 0 ? 1.4 + i * 0.08 : 0,
      phase: i * 0.7
    })),
    collectibles: hazardPattern.map((hazard, i) => ({
      x: hazard.x + Math.round(hazard.w * 0.5) + (i % 2 === 0 ? 12 : -12),
      y: groundY - collectibleHeights[i],
      r: 11,
      collected: false
    })),
    beacons: [
      { id: 'b0', x: 360, y: groundY - 58, r: 15, activated: false },
      { id: 'b1', x: 1220, y: groundY - 62, r: 15, activated: false },
      { id: 'b2', x: 1980, y: groundY - 60, r: 15, activated: false }
    ],
    serviceStops:
      nodeType === 'town'
        ? [
            { id: 'svc0', x: 620, w: 132, progress: 0, serviced: false },
            { id: 'svc1', x: 1610, w: 132, progress: 0, serviced: false }
          ]
        : []
  };
}
