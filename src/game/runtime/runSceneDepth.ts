function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface RunDepthBand {
  y: number;
  amplitude: number;
  wavelength: number;
  color: string;
  alpha: number;
  parallax: number;
}

export interface RunDepthProp {
  kind: 'pillar' | 'canopy' | 'crystal' | 'relay';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  parallax: number;
}

export interface RunMotionTrail {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

export interface RunSceneDepthView {
  bands: RunDepthBand[];
  props: RunDepthProp[];
  motionTrails: RunMotionTrail[];
}

interface BuildRunSceneDepthViewParams {
  nodeType: string;
  cameraX: number;
  elapsedSeconds: number;
  groundY: number;
  screenWidth: number;
  goalX: number;
  paceRatio: number;
  dashRatio: number;
  playerScreenX: number;
  playerY: number;
  playerWidth: number;
  playerHeight: number;
}

function baseBandPalette(nodeType: string): Array<Omit<RunDepthBand, 'y'>> {
  if (nodeType === 'anomaly') {
    return [
      { amplitude: 24, wavelength: 280, color: '#6d28d9', alpha: 0.08, parallax: 0.12 },
      { amplitude: 19, wavelength: 210, color: '#7c3aed', alpha: 0.11, parallax: 0.19 },
      { amplitude: 14, wavelength: 164, color: '#8b5cf6', alpha: 0.14, parallax: 0.28 }
    ];
  }

  if (nodeType === 'nature') {
    return [
      { amplitude: 28, wavelength: 320, color: '#166534', alpha: 0.08, parallax: 0.11 },
      { amplitude: 22, wavelength: 238, color: '#15803d', alpha: 0.11, parallax: 0.18 },
      { amplitude: 16, wavelength: 172, color: '#16a34a', alpha: 0.14, parallax: 0.26 }
    ];
  }

  if (nodeType === 'ruin') {
    return [
      { amplitude: 22, wavelength: 300, color: '#92400e', alpha: 0.08, parallax: 0.12 },
      { amplitude: 18, wavelength: 224, color: '#78350f', alpha: 0.11, parallax: 0.2 },
      { amplitude: 13, wavelength: 168, color: '#b45309', alpha: 0.14, parallax: 0.29 }
    ];
  }

  return [
    { amplitude: 22, wavelength: 300, color: '#0f766e', alpha: 0.08, parallax: 0.1 },
    { amplitude: 17, wavelength: 228, color: '#0d9488', alpha: 0.11, parallax: 0.18 },
    { amplitude: 13, wavelength: 168, color: '#14b8a6', alpha: 0.14, parallax: 0.27 }
  ];
}

function buildBands(nodeType: string, groundY: number): RunDepthBand[] {
  return baseBandPalette(nodeType).map((band, index) => ({
    ...band,
    y: groundY - 220 + index * 48
  }));
}

function buildProps(nodeType: string, cameraX: number, screenWidth: number, goalX: number, groundY: number): RunDepthProp[] {
  const startX = Math.floor(cameraX / 240) * 240 - 240;
  const endX = Math.min(goalX + 420, cameraX + screenWidth + 420);
  const props: RunDepthProp[] = [];

  for (let x = startX, index = 0; x <= endX; x += 240, index += 1) {
    if (nodeType === 'nature') {
      props.push({
        kind: 'canopy',
        x,
        y: groundY - (120 + (index % 3) * 18),
        width: 70 + (index % 2) * 18,
        height: 110 + (index % 3) * 16,
        color: index % 2 === 0 ? '#166534' : '#15803d',
        alpha: 0.12 + (index % 2) * 0.02,
        parallax: 0.34 + (index % 2) * 0.05
      });
      continue;
    }

    if (nodeType === 'ruin') {
      props.push({
        kind: 'pillar',
        x,
        y: groundY - (128 + (index % 3) * 22),
        width: 22 + (index % 2) * 8,
        height: 120 + (index % 3) * 18,
        color: index % 2 === 0 ? '#78350f' : '#92400e',
        alpha: 0.12 + (index % 2) * 0.025,
        parallax: 0.36 + (index % 2) * 0.04
      });
      continue;
    }

    if (nodeType === 'anomaly') {
      props.push({
        kind: 'crystal',
        x,
        y: groundY - (114 + (index % 4) * 18),
        width: 42 + (index % 2) * 10,
        height: 90 + (index % 4) * 14,
        color: index % 2 === 0 ? '#8b5cf6' : '#7c3aed',
        alpha: 0.13 + (index % 2) * 0.02,
        parallax: 0.35 + (index % 3) * 0.03
      });
      continue;
    }

    props.push({
      kind: 'relay',
      x,
      y: groundY - (106 + (index % 3) * 16),
      width: 32 + (index % 2) * 6,
      height: 92 + (index % 3) * 12,
      color: index % 2 === 0 ? '#0f766e' : '#115e59',
      alpha: 0.12 + (index % 2) * 0.02,
      parallax: 0.35 + (index % 2) * 0.04
    });
  }

  return props;
}

function buildMotionTrails(
  elapsedSeconds: number,
  paceRatio: number,
  dashRatio: number,
  playerScreenX: number,
  playerY: number,
  playerWidth: number,
  playerHeight: number
): RunMotionTrail[] {
  const energy = clamp(paceRatio * 0.85 + dashRatio * 1.1, 0, 1.7);
  const count = Math.max(0, Math.floor(energy * 4));
  const trails: RunMotionTrail[] = [];

  for (let index = 0; index < count; index += 1) {
    const phase = elapsedSeconds * 5.5 + index * 0.9;
    trails.push({
      x: playerScreenX - playerWidth * 0.2 - 12 - index * 18 - dashRatio * 18,
      y: playerY + playerHeight * (0.52 + (index % 3) * 0.08) + Math.sin(phase) * 3,
      width: 18 + energy * 22 - index * 2,
      height: 4 + (index % 2),
      alpha: clamp(0.04 + energy * 0.09 - index * 0.008, 0.03, 0.18)
    });
  }

  return trails;
}

export function buildRunSceneDepthView(params: BuildRunSceneDepthViewParams): RunSceneDepthView {
  return {
    bands: buildBands(params.nodeType, params.groundY),
    props: buildProps(params.nodeType, params.cameraX, params.screenWidth, params.goalX, params.groundY),
    motionTrails: buildMotionTrails(
      params.elapsedSeconds,
      params.paceRatio,
      params.dashRatio,
      params.playerScreenX,
      params.playerY,
      params.playerWidth,
      params.playerHeight
    )
  };
}
