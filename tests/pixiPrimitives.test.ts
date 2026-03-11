import type { Graphics, Text } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import {
  applyTextCard,
  drawChip,
  drawGauge,
  drawMessageCard,
  drawModuleMeters,
  drawPanel,
  drawPips,
  measureTextCard
} from '../src/game/render/pixiPrimitives';
import type { SceneTextCardSpec } from '../src/game/runtime/sceneTextCards';
import type { ModuleMeterView } from '../src/game/runtime/sceneHudView';

type GraphicsOp =
  | { kind: 'fill'; value: string | { alpha?: number; color?: string } }
  | { h: number; kind: 'roundRect'; radius: number; w: number; x: number; y: number }
  | { kind: 'stroke'; value: { alpha?: number; color?: string; width?: number } };

class GraphicsRecorder {
  readonly ops: GraphicsOp[] = [];

  fill(value: string | { alpha?: number; color?: string }): this {
    this.ops.push({ kind: 'fill', value });
    return this;
  }

  roundRect(x: number, y: number, w: number, h: number, radius: number): this {
    this.ops.push({ kind: 'roundRect', x, y, w, h, radius });
    return this;
  }

  stroke(value: { alpha?: number; color?: string; width?: number }): this {
    this.ops.push({ kind: 'stroke', value });
    return this;
  }
}

function createTextStub(width: number, height: number): Text {
  return {
    height,
    style: {},
    text: '',
    width,
    x: 0,
    y: 0
  } as unknown as Text;
}

describe('pixiPrimitives', () => {
  it('clamps gauge fill width to the track width', () => {
    const graphics = new GraphicsRecorder();

    drawGauge(graphics as unknown as Graphics, 12, 18, 40, 10, 1.6, '#38bdf8', '#0f172a');

    expect(graphics.ops).toEqual([
      { kind: 'roundRect', x: 12, y: 18, w: 40, h: 10, radius: 5 },
      { kind: 'fill', value: '#0f172a' },
      { kind: 'roundRect', x: 12, y: 18, w: 40, h: 10, radius: 5 },
      { kind: 'fill', value: '#38bdf8' }
    ]);
  });

  it('skips the fill pass when the gauge ratio is empty', () => {
    const graphics = new GraphicsRecorder();

    drawGauge(graphics as unknown as Graphics, 4, 6, 28, 12, -0.3, '#60a5fa');

    expect(graphics.ops).toEqual([
      { kind: 'roundRect', x: 4, y: 6, w: 28, h: 12, radius: 6 },
      { kind: 'fill', value: '#1f2937' }
    ]);
  });

  it('draws shared panel, chip, and pip primitives with the expected styling', () => {
    const graphics = new GraphicsRecorder();

    drawPanel(graphics as unknown as Graphics, 10, 20, 120, 48);
    drawChip(graphics as unknown as Graphics, 14, 76, 64, '#22c55e');
    drawPips(graphics as unknown as Graphics, 18, 110, 3, 2, '#f87171');

    expect(graphics.ops).toEqual([
      { kind: 'roundRect', x: 10, y: 20, w: 120, h: 48, radius: 18 },
      { kind: 'fill', value: { color: '#0f172a', alpha: 0.88 } },
      { kind: 'roundRect', x: 10, y: 20, w: 120, h: 48, radius: 18 },
      { kind: 'stroke', value: { color: '#e2e8f0', alpha: 0.2, width: 1.5 } },
      { kind: 'roundRect', x: 14, y: 76, w: 64, h: 24, radius: 12 },
      { kind: 'fill', value: { color: '#22c55e', alpha: 0.14 } },
      { kind: 'roundRect', x: 14, y: 76, w: 64, h: 24, radius: 12 },
      { kind: 'stroke', value: { color: '#22c55e', alpha: 0.32, width: 1 } },
      { kind: 'roundRect', x: 18, y: 110, w: 12, h: 12, radius: 4 },
      { kind: 'fill', value: '#f87171' },
      { kind: 'roundRect', x: 34, y: 110, w: 12, h: 12, radius: 4 },
      { kind: 'fill', value: '#f87171' },
      { kind: 'roundRect', x: 50, y: 110, w: 12, h: 12, radius: 4 },
      { kind: 'fill', value: '#334155' }
    ]);
  });

  it('draws module meter cells with stacked level and condition gauges', () => {
    const graphics = new GraphicsRecorder();
    const moduleMeters: ModuleMeterView[] = [
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#f59e0b',
        conditionRatio: 2 / 3,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 0.5,
        subsystem: 'engine',
        x: 100,
        y: 120
      }
    ];

    drawModuleMeters(graphics as unknown as Graphics, moduleMeters);

    expect(graphics.ops).toEqual([
      { kind: 'roundRect', x: 100, y: 120, w: 76, h: 28, radius: 10 },
      { kind: 'fill', value: { color: '#111827', alpha: 0.9 } },
      { kind: 'roundRect', x: 130, y: 126, w: 38, h: 6, radius: 3 },
      { kind: 'fill', value: '#1e293b' },
      { kind: 'roundRect', x: 130, y: 126, w: 19, h: 6, radius: 3 },
      { kind: 'fill', value: '#60a5fa' },
      { kind: 'roundRect', x: 130, y: 136, w: 38, h: 6, radius: 3 },
      { kind: 'fill', value: '#1e293b' },
      { kind: 'roundRect', x: 130, y: 136, w: 25.333333333333332, h: 6, radius: 3 },
      { kind: 'fill', value: '#f59e0b' }
    ]);
  });

  it('measures and applies text cards through the shared card helper', () => {
    const graphics = new GraphicsRecorder();
    const textNode = createTextStub(180, 24);
    const card: SceneTextCardSpec = {
      align: 'center',
      fill: '#e2e8f0',
      fontSize: 18,
      maxWidth: 320,
      minWidth: 220,
      paddingX: 18,
      paddingY: 14,
      text: 'Signal source reached.',
      tone: 'dark',
      x: 60,
      y: 40
    };

    expect(measureTextCard(textNode, card)).toEqual({ width: 180, height: 24 });
    expect(applyTextCard(graphics as unknown as Graphics, textNode, card)).toEqual({ width: 220, height: 52 });
    expect(textNode.text).toBe('Signal source reached.');
    expect(textNode.style.wordWrapWidth).toBe(184);
    expect(graphics.ops.slice(0, 4)).toEqual([
      { kind: 'roundRect', x: 60, y: 40, w: 220, h: 52, radius: 18 },
      { kind: 'fill', value: { color: '#0f172a', alpha: 0.88 } },
      { kind: 'roundRect', x: 60, y: 40, w: 220, h: 52, radius: 18 },
      { kind: 'stroke', value: { color: '#cbd5e1', alpha: 0.22, width: 1.2 } }
    ]);
  });

  it('switches message-card palette for light-tone cards', () => {
    const graphics = new GraphicsRecorder();

    drawMessageCard(graphics as unknown as Graphics, 24, 30, 180, 72, 'light');

    expect(graphics.ops).toEqual([
      { kind: 'roundRect', x: 24, y: 30, w: 180, h: 72, radius: 18 },
      { kind: 'fill', value: { color: '#f8fafc', alpha: 0.94 } },
      { kind: 'roundRect', x: 24, y: 30, w: 180, h: 72, radius: 18 },
      { kind: 'stroke', value: { color: '#94a3b8', alpha: 0.22, width: 1.2 } }
    ]);
  });
});
