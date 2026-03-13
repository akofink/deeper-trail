import type { Beacon, CanopyLift, ImpactPlate, ServiceStop, SyncGate } from '../state/runObjectives';
import type { Collectible, Hazard } from './runtimeState';
import { encounterRiseAt } from './runTerrainProfile';

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

type HazardTemplate = {
  kind: Hazard['kind'];
  x: number;
  width: number;
  height: number;
  collectibleOffsetX: number;
  collectibleHeight: number;
  amplitudeX?: number;
  amplitudeY?: number;
  pulse?: number;
  speed?: number;
  phase?: number;
};

function createHazard(groundY: number, nodeType: string, template: HazardTemplate, encounterIndex: number): Hazard {
  const rise = encounterRiseAt(nodeType, encounterIndex);
  const height = template.height;
  return {
    kind: template.kind,
    x: template.x,
    baseX: template.x,
    y: groundY - height - Math.round(rise * 0.2),
    baseY: groundY - height - Math.round(rise * 0.2),
    w: template.width,
    baseW: template.width,
    h: height,
    baseH: height,
    amplitudeX: template.amplitudeX ?? 0,
    amplitudeY: template.amplitudeY ?? 0,
    pulse: template.pulse ?? 0,
    speed: template.speed ?? 0,
    phase: template.phase ?? 0
  };
}

function hazardTemplatesForNodeType(nodeType: string): HazardTemplate[] {
  if (nodeType === 'anomaly') {
    return [
      { kind: 'pulsing', x: 430, width: 66, height: 18, collectibleOffsetX: 30, collectibleHeight: 92, pulse: 14, speed: 1.3, phase: 0.1 },
      { kind: 'sweeper', x: 760, width: 82, height: 18, collectibleOffsetX: -18, collectibleHeight: 104, amplitudeX: 40, speed: 1.55, phase: 0.8 },
      { kind: 'stomper', x: 1095, width: 54, height: 34, collectibleOffsetX: 16, collectibleHeight: 98, amplitudeY: 36, speed: 1.1, phase: 1.4 },
      { kind: 'pulsing', x: 1445, width: 88, height: 18, collectibleOffsetX: -14, collectibleHeight: 112, pulse: 18, speed: 1.45, phase: 2.1 },
      { kind: 'sweeper', x: 1795, width: 72, height: 18, collectibleOffsetX: 18, collectibleHeight: 102, amplitudeX: 46, speed: 1.7, phase: 2.8 },
      { kind: 'stomper', x: 2140, width: 52, height: 38, collectibleOffsetX: -10, collectibleHeight: 118, amplitudeY: 42, speed: 1.2, phase: 3.5 }
    ];
  }
  if (nodeType === 'ruin') {
    return [
      { kind: 'static', x: 420, width: 78, height: 20, collectibleOffsetX: 20, collectibleHeight: 74 },
      { kind: 'stomper', x: 735, width: 58, height: 34, collectibleOffsetX: -14, collectibleHeight: 92, amplitudeY: 24, speed: 0.95, phase: 0.6 },
      { kind: 'sweeper', x: 1080, width: 90, height: 18, collectibleOffsetX: 10, collectibleHeight: 86, amplitudeX: 28, speed: 1.2, phase: 1.3 },
      { kind: 'static', x: 1430, width: 84, height: 24, collectibleOffsetX: -18, collectibleHeight: 94 },
      { kind: 'stomper', x: 1765, width: 62, height: 38, collectibleOffsetX: 14, collectibleHeight: 102, amplitudeY: 30, speed: 1.05, phase: 2.2 },
      { kind: 'sweeper', x: 2100, width: 86, height: 18, collectibleOffsetX: -12, collectibleHeight: 90, amplitudeX: 34, speed: 1.35, phase: 2.9 }
    ];
  }
  if (nodeType === 'nature') {
    return [
      { kind: 'sweeper', x: 425, width: 58, height: 18, collectibleOffsetX: 14, collectibleHeight: 74, amplitudeX: 18, speed: 0.95, phase: 0.2 },
      { kind: 'static', x: 760, width: 72, height: 16, collectibleOffsetX: -16, collectibleHeight: 88 },
      { kind: 'stomper', x: 1090, width: 46, height: 30, collectibleOffsetX: 18, collectibleHeight: 82, amplitudeY: 18, speed: 0.85, phase: 1.1 },
      { kind: 'sweeper', x: 1420, width: 76, height: 18, collectibleOffsetX: -12, collectibleHeight: 100, amplitudeX: 22, speed: 1.05, phase: 1.8 },
      { kind: 'static', x: 1750, width: 70, height: 16, collectibleOffsetX: 16, collectibleHeight: 90 },
      { kind: 'stomper', x: 2080, width: 48, height: 28, collectibleOffsetX: -10, collectibleHeight: 96, amplitudeY: 22, speed: 0.92, phase: 2.6 }
    ];
  }
  return [
    { kind: 'static', x: 440, width: 72, height: 18, collectibleOffsetX: 14, collectibleHeight: 70 },
    { kind: 'sweeper', x: 770, width: 84, height: 18, collectibleOffsetX: -18, collectibleHeight: 90, amplitudeX: 24, speed: 1.05, phase: 0.7 },
    { kind: 'static', x: 1110, width: 80, height: 20, collectibleOffsetX: 12, collectibleHeight: 82 },
    { kind: 'sweeper', x: 1450, width: 88, height: 18, collectibleOffsetX: -14, collectibleHeight: 98, amplitudeX: 26, speed: 1.18, phase: 1.5 },
    { kind: 'static', x: 1790, width: 84, height: 20, collectibleOffsetX: 16, collectibleHeight: 88 },
    { kind: 'sweeper', x: 2130, width: 78, height: 18, collectibleOffsetX: -10, collectibleHeight: 94, amplitudeX: 30, speed: 1.28, phase: 2.3 }
  ];
}

function beaconOffsetY(nodeType: string, encounterIndex: number, beaconIndex: number): number {
  const rise = encounterRiseAt(nodeType, encounterIndex);

  if (nodeType === 'town') {
    const groundedOffsets = [48, 52, 50];
    return groundedOffsets[beaconIndex] + Math.round(rise * 0.45);
  }

  return ([58, 62, 60][beaconIndex] ?? 58) + Math.round(rise * 0.7);
}

export function buildRunLayout(groundY: number, nodeType: string): {
  goalX: number;
  hazards: Hazard[];
  collectibles: Collectible[];
  beacons: Beacon[];
  serviceStops: ServiceStop[];
  syncGates: SyncGate[];
  canopyLifts: CanopyLift[];
  impactPlates: ImpactPlate[];
} {
  const hazardTemplates = hazardTemplatesForNodeType(nodeType);
  const beaconRiseIndexes = [0, 2, 4];

  return {
    goalX: 2450,
    hazards: hazardTemplates.map((hazard, i) => createHazard(groundY, nodeType, hazard, i)),
    collectibles: hazardTemplates.map((hazard, i) => ({
      x: hazard.x + Math.round(hazard.width * 0.5) + hazard.collectibleOffsetX,
      y: groundY - hazard.collectibleHeight - encounterRiseAt(nodeType, i),
      r: 11,
      collected: false
    })),
    beacons: beaconRiseIndexes.map((riseIndex, index) => ({
      id: `b${index}`,
      x: [360, 1220, 1980][index] ?? 360,
      y: groundY - beaconOffsetY(nodeType, riseIndex, index),
      r: 15,
      activated: false
    })),
    serviceStops:
      nodeType === 'town'
        ? [
            { id: 'svc0', x: 620, w: 132, progress: 0, serviced: false },
            { id: 'svc1', x: 1610, w: 132, progress: 0, serviced: false }
          ]
        : [],
    syncGates:
      nodeType === 'anomaly'
        ? [
            {
              id: 'sg0',
              x: 680,
              y: groundY - 102 - Math.round(encounterRiseAt(nodeType, 1) * 0.75),
              w: 62,
              h: 88,
              stabilized: false
            },
            {
              id: 'sg1',
              x: 1700,
              y: groundY - 118 - Math.round(encounterRiseAt(nodeType, 4) * 0.75),
              w: 66,
              h: 94,
              stabilized: false
            }
          ]
        : [],
    canopyLifts:
      nodeType === 'nature'
        ? [
            {
              id: 'cl0',
              x: 660,
              y: groundY - 114 - Math.round(encounterRiseAt(nodeType, 1) * 0.7),
              w: 120,
              h: 108,
              progress: 0,
              charted: false
            },
            {
              id: 'cl1',
              x: 1680,
              y: groundY - 122 - Math.round(encounterRiseAt(nodeType, 5) * 0.7),
              w: 126,
              h: 116,
              progress: 0,
              charted: false
            }
          ]
        : [],
    impactPlates:
      nodeType === 'ruin'
        ? [
            { id: 'ip0', x: 630, w: 112, shattered: false },
            { id: 'ip1', x: 1710, w: 120, shattered: false }
          ]
        : []
  };
}
