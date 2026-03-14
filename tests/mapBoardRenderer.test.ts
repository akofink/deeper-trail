import type { Graphics } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { drawMapBoard } from '../src/game/render/mapBoardRenderer';
import type { MapBoardView } from '../src/game/runtime/mapBoardView';

type GraphicsOp =
  | { kind: 'circle'; radius: number; x: number; y: number }
  | { kind: 'closePath' }
  | { kind: 'fill'; value: string | { alpha?: number; color?: string } }
  | { kind: 'lineTo'; x: number; y: number }
  | { kind: 'moveTo'; x: number; y: number }
  | { kind: 'stroke'; value: { alpha?: number; color?: string; width?: number } };

class GraphicsRecorder {
  readonly ops: GraphicsOp[] = [];

  circle(x: number, y: number, radius: number): this {
    this.ops.push({ kind: 'circle', x, y, radius });
    return this;
  }

  closePath(): this {
    this.ops.push({ kind: 'closePath' });
    return this;
  }

  fill(value: string | { alpha?: number; color?: string }): this {
    this.ops.push({ kind: 'fill', value });
    return this;
  }

  lineTo(x: number, y: number): this {
    this.ops.push({ kind: 'lineTo', x, y });
    return this;
  }

  moveTo(x: number, y: number): this {
    this.ops.push({ kind: 'moveTo', x, y });
    return this;
  }

  stroke(value: { alpha?: number; color?: string; width?: number }): this {
    this.ops.push({ kind: 'stroke', value });
    return this;
  }
}

describe('mapBoardRenderer', () => {
  it('draws map edges before node markers', () => {
    const graphics = new GraphicsRecorder();
    const mapBoardView: MapBoardView = {
      edges: [
        {
          alpha: 0.88,
          color: '#f59e0b',
          from: { depth: 0, x: 20, y: 30 },
          isSelected: true,
          to: { depth: 0, x: 80, y: 90 },
          width: 4.5
        }
      ],
      nodes: [
        {
          completed: false,
          current: false,
          depth: 0,
          fill: '#2563eb',
          glowColor: null,
          glowRadius: null,
          goal: false,
          id: 'n0',
          intelMarkers: [],
          innerDot: false,
          outline: false,
          paletteLabel: 'town',
          radius: 10,
          selected: false,
          starRadius: null,
          visited: false,
          x: 40,
          y: 44
        }
      ],
      selectedNodeId: null
    };

    drawMapBoard(graphics as unknown as Graphics, mapBoardView);

    expect(graphics.ops).toEqual([
      { kind: 'moveTo', x: 20, y: 30 },
      { kind: 'lineTo', x: 80, y: 90 },
      { kind: 'stroke', value: { color: '#f59e0b', width: 4.5, alpha: 0.88 } },
      { kind: 'circle', x: 40, y: 44, radius: 10 },
      { kind: 'fill', value: '#2563eb' }
    ]);
  });

  it('draws goal, glow, outline, inner dot, and star accents for decorated nodes', () => {
    const graphics = new GraphicsRecorder();
    const mapBoardView: MapBoardView = {
      edges: [],
      nodes: [
        {
          completed: true,
          current: false,
          depth: 12,
          fill: '#22c55e',
          glowColor: '#86efac',
          glowRadius: 18,
          goal: true,
          id: 'n1',
          intelMarkers: [
            { fill: '#34d399', radius: 3.5, xOffset: -12, yOffset: -10 },
            { fill: '#fbbf24', radius: 3.5, xOffset: 12, yOffset: -10 }
          ],
          innerDot: true,
          outline: true,
          paletteLabel: 'forest',
          radius: 12,
          selected: false,
          starRadius: 18,
          visited: true,
          x: 120,
          y: 140
        }
      ],
      selectedNodeId: null
    };

    drawMapBoard(graphics as unknown as Graphics, mapBoardView);

    expect(graphics.ops).toEqual([
      { kind: 'circle', x: 120, y: 140, radius: 24 },
      { kind: 'stroke', value: { color: '#f59e0b', width: 2.5, alpha: 0.55 } },
      { kind: 'circle', x: 120, y: 140, radius: 18 },
      { kind: 'fill', value: { color: '#86efac', alpha: 0.16 } },
      { kind: 'circle', x: 120, y: 140, radius: 16 },
      { kind: 'stroke', value: { color: '#0f172a', width: 2, alpha: 0.6 } },
      { kind: 'circle', x: 120, y: 140, radius: 12 },
      { kind: 'fill', value: '#22c55e' },
      { kind: 'circle', x: 120, y: 140, radius: 7 },
      { kind: 'fill', value: '#f8fafc' },
      { kind: 'circle', x: 108, y: 130, radius: 3.5 },
      { kind: 'fill', value: '#34d399' },
      { kind: 'circle', x: 108, y: 130, radius: 4.9 },
      { kind: 'stroke', value: { color: '#0f172a', width: 1.3, alpha: 0.55 } },
      { kind: 'circle', x: 132, y: 130, radius: 3.5 },
      { kind: 'fill', value: '#fbbf24' },
      { kind: 'circle', x: 132, y: 130, radius: 4.9 },
      { kind: 'stroke', value: { color: '#0f172a', width: 1.3, alpha: 0.55 } },
      { kind: 'moveTo', x: 120, y: 122 },
      { kind: 'lineTo', x: 124, y: 138 },
      { kind: 'lineTo', x: 138, y: 140 },
      { kind: 'lineTo', x: 124, y: 142 },
      { kind: 'lineTo', x: 120, y: 158 },
      { kind: 'lineTo', x: 116, y: 142 },
      { kind: 'lineTo', x: 102, y: 140 },
      { kind: 'lineTo', x: 116, y: 138 },
      { kind: 'closePath' },
      { kind: 'stroke', value: { color: '#fbbf24', width: 1.6, alpha: 0.65 } }
    ]);
  });

  it('uses the stronger glow alpha for the current node', () => {
    const graphics = new GraphicsRecorder();
    const mapBoardView: MapBoardView = {
      edges: [],
      nodes: [
        {
          completed: false,
          current: true,
          depth: 4,
          fill: '#2563eb',
          glowColor: '#60a5fa',
          glowRadius: 20,
          goal: false,
          id: 'n2',
          intelMarkers: [],
          innerDot: false,
          outline: false,
          paletteLabel: 'town',
          radius: 14,
          selected: false,
          starRadius: null,
          visited: true,
          x: 64,
          y: 72
        }
      ],
      selectedNodeId: null
    };

    drawMapBoard(graphics as unknown as Graphics, mapBoardView);

    expect(graphics.ops).toEqual([
      { kind: 'circle', x: 64, y: 72, radius: 20 },
      { kind: 'fill', value: { color: '#60a5fa', alpha: 0.2 } },
      { kind: 'circle', x: 64, y: 72, radius: 14 },
      { kind: 'fill', value: '#2563eb' }
    ]);
  });
});
