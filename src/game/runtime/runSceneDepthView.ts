import { runSpeedForState } from './vehicleDerivedStats';
import type { RuntimeState } from './runtimeState';

export interface RunSceneDepthBand {
  alpha: number;
  color: string;
  height: number;
  y: number;
}

export interface RunSceneDepthProp {
  alpha: number;
  color: string;
  height: number;
  shape: 'arch' | 'blob' | 'pillar' | 'slab';
  width: number;
  x: number;
  y: number;
}

export interface RunSceneSpeedLine {
  alpha: number;
  color: string;
  width: number;
  x: number;
  y: number;
}

export interface RunSceneDepthView {
  bands: RunSceneDepthBand[];
  props: RunSceneDepthProp[];
  speedLines: RunSceneSpeedLine[];
}

interface DepthPalette {
  bandColors: [string, string];
  glow: string;
  propColors: [string, string];
  speedLine: string;
  shapes: [RunSceneDepthProp['shape'], RunSceneDepthProp['shape']];
}

const DEPTH_PALETTES: Record<string, DepthPalette> = {
  anomaly: {
    bandColors: ['#7c3aed', '#5b21b6'],
    glow: '#e9d5ff',
    propColors: ['#6d28d9', '#4c1d95'],
    speedLine: '#ddd6fe',
    shapes: ['arch', 'pillar']
  },
  nature: {
    bandColors: ['#22c55e', '#15803d'],
    glow: '#dcfce7',
    propColors: ['#16a34a', '#166534'],
    speedLine: '#bbf7d0',
    shapes: ['blob', 'pillar']
  },
  ruin: {
    bandColors: ['#d97706', '#92400e'],
    glow: '#fde68a',
    propColors: ['#b45309', '#78350f'],
    speedLine: '#fed7aa',
    shapes: ['slab', 'pillar']
  },
  town: {
    bandColors: ['#14b8a6', '#0f766e'],
    glow: '#ccfbf1',
    propColors: ['#0f766e', '#115e59'],
    speedLine: '#99f6e4',
    shapes: ['arch', 'slab']
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function paletteForNodeType(nodeType: string): DepthPalette {
  return DEPTH_PALETTES[nodeType] ?? DEPTH_PALETTES.town;
}

export function buildRunSceneDepthView(
  state: RuntimeState,
  nodeType: string,
  screenWidth: number,
  screenHeight: number
): RunSceneDepthView {
  const palette = paletteForNodeType(nodeType);
  const speedRatio = clamp(Math.abs(state.player.vx) / Math.max(1, runSpeedForState(state)), 0, 1.4);
  const dashRatio = clamp(state.dashBoost, 0, 1);
  const motionRatio = clamp(speedRatio * 0.75 + dashRatio * 0.9, 0, 1.6);

  const bands: RunSceneDepthBand[] = [
    {
      color: palette.glow,
      alpha: 0.1 + dashRatio * 0.05,
      y: Math.round(screenHeight * 0.26),
      height: Math.round(screenHeight * 0.18)
    },
    {
      color: palette.bandColors[0],
      alpha: 0.09,
      y: state.groundY - 230,
      height: 76
    },
    {
      color: palette.bandColors[1],
      alpha: 0.13,
      y: state.groundY - 146,
      height: 104
    }
  ];

  const layerConfigs = [
    {
      spacing: 250,
      parallax: 0.18,
      widthBase: 96,
      widthStep: 16,
      heightBase: 82,
      heightStep: 18,
      yBase: state.groundY - 198,
      sway: 18,
      alpha: 0.12,
      color: palette.propColors[0],
      shape: palette.shapes[0]
    },
    {
      spacing: 198,
      parallax: 0.34,
      widthBase: 72,
      widthStep: 14,
      heightBase: 94,
      heightStep: 22,
      yBase: state.groundY - 124,
      sway: 12,
      alpha: 0.18,
      color: palette.propColors[1],
      shape: palette.shapes[1]
    }
  ] as const;

  const props: RunSceneDepthProp[] = [];
  layerConfigs.forEach((layer, layerIndex) => {
    const worldStart = Math.floor(state.cameraX / layer.spacing) * layer.spacing - layer.spacing * 2;
    const worldEnd = state.cameraX + screenWidth / Math.max(0.16, layer.parallax) + layer.spacing * 2;

    for (let worldX = worldStart; worldX <= worldEnd; worldX += layer.spacing) {
      const index = Math.floor(worldX / layer.spacing);
      const sizeIndex = positiveModulo(index + layerIndex, 4);
      props.push({
        shape: layer.shape,
        color: layer.color,
        alpha: layer.alpha,
        width: layer.widthBase + sizeIndex * layer.widthStep,
        height: layer.heightBase + positiveModulo(index * 2 + layerIndex, 5) * layer.heightStep,
        x: Math.round(worldX - state.cameraX * layer.parallax),
        y:
          layer.yBase -
          Math.round(
            Math.sin(index * 0.8 + layerIndex * 0.6) * layer.sway +
              Math.cos(index * 0.35 + layerIndex) * (layer.sway * 0.4)
          )
      });
    }
  });

  const speedLines: RunSceneSpeedLine[] = [];
  if (motionRatio > 0.08) {
    const lineCount = 4 + Math.round(motionRatio * 6);
    const spacing = Math.max(54, Math.round(106 - motionRatio * 28));
    const offset = positiveModulo(state.cameraX * (0.3 + motionRatio * 0.24) + state.elapsedSeconds * (120 + motionRatio * 110), spacing);

    for (let index = -1; index <= lineCount; index += 1) {
      const yWave = Math.sin(state.elapsedSeconds * 2.2 + index * 0.9) * 6;
      speedLines.push({
        color: palette.speedLine,
        alpha: clamp(0.08 + motionRatio * 0.12 - Math.abs(index - lineCount * 0.45) * 0.005, 0.06, 0.24),
        width: Math.round(44 + motionRatio * 48 + positiveModulo(index, 3) * 8),
        x: Math.round(index * spacing - offset),
        y: Math.round(state.groundY + 22 + positiveModulo(index, 3) * 16 + yWave)
      });
    }
  }

  return { bands, props, speedLines };
}
