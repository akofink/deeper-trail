import type { Graphics, Text } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { MapSceneHudViewModel } from '../src/game/runtime/mapSceneHudView';
import type { MapSceneTextAssembly } from '../src/game/runtime/mapSceneTextAssembly';
import type { RunSceneHudViewModel } from '../src/game/runtime/runSceneHudView';
import type { RunSceneTextAssembly } from '../src/game/runtime/runSceneTextAssembly';
import {
  applyOptionalTextCard,
  drawCelebrationAccents,
  drawSceneActionChips,
  renderMapSceneCards,
  renderMapSceneHud,
  renderRunSceneHud
} from '../src/game/render/sceneHudRenderer';

type GraphicsOp =
  | { kind: 'circle'; r: number; x: number; y: number }
  | { kind: 'fill'; value: string | { alpha?: number; color?: string } }
  | { h: number; kind: 'roundRect'; radius: number; w: number; x: number; y: number }
  | { kind: 'stroke'; value: { alpha?: number; color?: string; width?: number } };

class GraphicsRecorder {
  readonly ops: GraphicsOp[] = [];

  circle(x: number, y: number, r: number): this {
    this.ops.push({ kind: 'circle', x, y, r });
    return this;
  }

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

function createTextNode(text = ''): Text {
  return {
    height: 24,
    style: {},
    text,
    width: 160,
    x: 0,
    y: 0
  } as Text;
}

describe('sceneHudRenderer', () => {
  it('renders run-scene HUD chrome and applies label text', () => {
    const graphics = new GraphicsRecorder();
    const labels = {
      beaconLabels: [createTextNode()],
      hud: createTextNode(),
      leftRowLabels: [createTextNode(), createTextNode(), createTextNode()],
      leftRowValues: [createTextNode(), createTextNode(), createTextNode()],
      moduleLabels: [createTextNode()],
      panelMeta: createTextNode(),
      panelSeed: createTextNode(),
      rightRowLabels: [createTextNode(), createTextNode(), createTextNode()],
      rightRowValues: [createTextNode(), createTextNode()]
    };
    const hud = {
      boostGauge: { fill: '#a78bfa', h: 12, ratio: 0.5, w: 80, x: 220, y: 72 },
      fuelGauge: { fill: '#38bdf8', h: 12, ratio: 0.75, w: 84, x: 44, y: 56 },
      healthPips: { count: 3, fillColor: '#f97316', filled: 2, x: 44, y: 28 },
      layout: { leftPanelHeight: 120, leftPanelWidth: 180, leftPanelX: 10, rightPanelHeight: 144, rightPanelWidth: 200, rightPanelX: 210 },
      moduleMeters: [
        {
          cellHeight: 28,
          cellWidth: 76,
          conditionColor: '#34d399',
          conditionRatio: 1,
          gaugeHeight: 6,
          gaugeWidth: 38,
          levelRatio: 0.5,
          subsystem: 'engine',
          x: 224,
          y: 92
        }
      ],
      objectivePips: { count: 3, fillColor: '#22c55e', filled: 1, x: 220, y: 28 },
      paceGauge: { fill: '#f59e0b', h: 10, ratio: 0.4, w: 84, x: 44, y: 84 }
    } as unknown as RunSceneHudViewModel;
    const textAssembly = {
      beaconLabels: [{ fill: '#e2e8f0', text: 'B1', x: 40, y: 60 }],
      chipLabels: [],
      header: {
        meta: { fill: '#cbd5e1', fontSize: 12, text: 'meta', x: 14, y: 34 },
        seed: { fill: '#94a3b8', text: 'seed', x: 14, y: 46 },
        title: { fill: '#e2e8f0', fontSize: 18, text: 'RUN', x: 14, y: 16 }
      },
      leftRowLabels: [
        { fill: '#94a3b8', text: 'HP', x: 16, y: 20 },
        { fill: '#94a3b8', text: 'Fuel', x: 16, y: 48 },
        { fill: '#94a3b8', text: 'Pace', x: 16, y: 74 }
      ],
      leftRowValues: [
        { align: 'right', fill: '#e2e8f0', text: '2/3', x: 140, y: 20 },
        { align: 'right', fill: '#e2e8f0', text: '8/10', x: 140, y: 48 },
        { align: 'right', fill: '#e2e8f0', text: '40%', x: 140, y: 74 }
      ],
      moduleLabels: [{ fill: '#cbd5e1', text: 'ENG', x: 228, y: 96 }],
      rightRowLabels: [
        { fill: '#94a3b8', text: 'Links', x: 216, y: 20 },
        { fill: '#94a3b8', text: 'Boost', x: 216, y: 48 },
        { fill: '#94a3b8', text: 'Systems', x: 216, y: 74 }
      ],
      rightRowValues: [
        { align: 'right', fill: '#e2e8f0', text: '1/3', x: 360, y: 20 },
        { align: 'right', fill: '#e2e8f0', text: '50%', x: 360, y: 48 }
      ]
    } as RunSceneTextAssembly;

    renderRunSceneHud(graphics as unknown as Graphics, labels, hud, textAssembly);

    expect(labels.hud.text).toBe('RUN');
    expect(labels.panelMeta.text).toBe('meta');
    expect(labels.panelSeed.text).toBe('seed');
    expect(labels.beaconLabels[0]?.text).toBe('B1');
    expect(labels.leftRowLabels[1]?.text).toBe('Fuel');
    expect(labels.rightRowValues[1]?.text).toBe('50%');
    expect(labels.moduleLabels[0]?.text).toBe('ENG');
    expect(graphics.ops.slice(0, 4)).toEqual([
      { kind: 'roundRect', x: 10, y: 10, w: 180, h: 120, radius: 18 },
      { kind: 'fill', value: { color: '#0f172a', alpha: 0.88 } },
      { kind: 'roundRect', x: 10, y: 10, w: 180, h: 120, radius: 18 },
      { kind: 'stroke', value: { color: '#e2e8f0', alpha: 0.2, width: 1.5 } }
    ]);
  });

  it('renders map-scene HUD chrome and applies label text', () => {
    const graphics = new GraphicsRecorder();
    const labels = {
      hud: createTextNode(),
      leftRowLabels: [createTextNode(), createTextNode()],
      leftRowValues: [createTextNode(), createTextNode()],
      moduleLabels: [createTextNode()],
      panelMeta: createTextNode(),
      panelSeed: createTextNode(),
      rightHeaderLines: [createTextNode(), createTextNode()]
    };
    const hud = {
      freeTripFilled: 1,
      freeTripTotal: 3,
      fuelRatio: 0.6,
      layout: {
        gaugeWidth: 140,
        gaugeX: 98,
        leftPanelHeight: 142,
        leftPanelWidth: 344,
        leftPanelX: 20,
        leftPanelY: 18,
        pipsX: 98,
        rightPanelHeight: 162,
        rightPanelWidth: 316,
        rightPanelX: 420,
        rightPanelY: 18
      },
      leftRows: [
        { label: 'Trips', value: '1', y: 79 },
        { label: 'Fuel', value: '6/10', y: 105 }
      ],
      moduleMeters: [
        {
          cellHeight: 28,
          cellWidth: 76,
          conditionColor: '#34d399',
          conditionRatio: 1,
          gaugeHeight: 6,
          gaugeWidth: 38,
          levelRatio: 0.75,
          subsystem: 'frame',
          x: 432,
          y: 88
        }
      ]
    } as unknown as MapSceneHudViewModel;
    const textAssembly = {
      chipLabels: [],
      header: {
        meta: { fill: '#cbd5e1', fontSize: 12, text: 'meta', x: 36, y: 48 },
        seed: { fill: '#94a3b8', text: 'seed', x: 36, y: 60 },
        title: { fill: '#e2e8f0', fontSize: 18, text: 'MAP', x: 36, y: 16 }
      },
      leftRowLabels: [
        { fill: '#94a3b8', text: 'Trips', x: 36, y: 70 },
        { fill: '#94a3b8', text: 'Fuel', x: 36, y: 96 }
      ],
      leftRowValues: [
        { align: 'right', fill: '#e2e8f0', text: '1', x: 300, y: 70 },
        { align: 'right', fill: '#e2e8f0', text: '6/10', x: 300, y: 96 }
      ],
      moduleLabels: [{ fill: '#cbd5e1', text: 'FRAME', x: 436, y: 92 }],
      rightHeaderLines: [
        { fill: '#94a3b8', text: 'Service', x: 446, y: 54 },
        { fill: '#94a3b8', text: 'Bay', x: 446, y: 68 }
      ]
    } as MapSceneTextAssembly;

    renderMapSceneHud(graphics as unknown as Graphics, labels, hud, textAssembly);

    expect(labels.hud.text).toBe('MAP');
    expect(labels.panelMeta.text).toBe('meta');
    expect(labels.panelSeed.text).toBe('seed');
    expect(labels.leftRowValues[1]?.text).toBe('6/10');
    expect(labels.rightHeaderLines[0]?.text).toBe('Service');
    expect(labels.moduleLabels[0]?.text).toBe('FRAME');
    expect(graphics.ops.slice(0, 4)).toEqual([
      { kind: 'roundRect', x: 20, y: 18, w: 344, h: 142, radius: 18 },
      { kind: 'fill', value: { color: '#0f172a', alpha: 0.88 } },
      { kind: 'roundRect', x: 20, y: 18, w: 344, h: 142, radius: 18 },
      { kind: 'stroke', value: { color: '#e2e8f0', alpha: 0.2, width: 1.5 } }
    ]);
  });

  it('draws chip rows, optional cards, and celebration accents through shared helpers', () => {
    const graphics = new GraphicsRecorder();
    const overlay = createTextNode('stale');

    drawSceneActionChips(graphics as unknown as Graphics, [
      { color: '#22c55e', height: 24, label: 'Enter', labelFill: '#0f172a', w: 72, x: 20, y: 200 }
    ]);
    applyOptionalTextCard(graphics as unknown as Graphics, overlay, null);
    expect(overlay.text).toBe('');

    applyOptionalTextCard(graphics as unknown as Graphics, overlay, {
      align: 'center',
      fill: '#f8fafc',
      fontSize: 16,
      maxWidth: 240,
      minWidth: 180,
      paddingX: 18,
      paddingY: 14,
      text: 'Signal source reached.',
      tone: 'dark',
      x: 40,
      y: 40
    });
    drawCelebrationAccents(graphics as unknown as Graphics, [{ color: '#f59e0b', r: 6, x: 120, y: 90 }]);

    expect(overlay.text).toBe('Signal source reached.');
    expect(graphics.ops).toContainEqual({ kind: 'circle', x: 120, y: 90, r: 6 });
  });

  it('renders map scene cards and clears stale celebration text when no card is present', () => {
    const graphics = new GraphicsRecorder();
    const overlay = createTextNode('stale route');
    const fieldNotesText = createTextNode('stale notes');
    const celebrationOverlay = createTextNode('stale celebration');

    renderMapSceneCards(
      graphics as unknown as Graphics,
      { celebrationOverlay, fieldNotesText, overlay },
      {
        celebrationCard: null,
        notesCard: {
          align: 'left',
          fill: '#0f172a',
          fontSize: 13,
          maxWidth: 240,
          minWidth: 180,
          paddingX: 18,
          paddingY: 14,
          text: 'Notebook clue summary',
          tone: 'light',
          x: 40,
          y: 140
        },
        routeCard: {
          align: 'left',
          fill: '#e2e8f0',
          fontSize: 15,
          maxWidth: 260,
          minWidth: 180,
          paddingX: 18,
          paddingY: 14,
          text: 'Route preview',
          tone: 'dark',
          x: 40,
          y: 40
        }
      },
      [{ color: '#f59e0b', r: 6, x: 120, y: 90 }]
    );

    expect(overlay.text).toBe('Route preview');
    expect(fieldNotesText.text).toBe('Notebook clue summary');
    expect(celebrationOverlay.text).toBe('');
    expect(graphics.ops).not.toContainEqual({ kind: 'circle', x: 120, y: 90, r: 6 });
  });

  it('renders celebration card accents when the expedition-complete card is present', () => {
    const graphics = new GraphicsRecorder();
    const overlay = createTextNode();
    const fieldNotesText = createTextNode();
    const celebrationOverlay = createTextNode();

    renderMapSceneCards(
      graphics as unknown as Graphics,
      { celebrationOverlay, fieldNotesText, overlay },
      {
        celebrationCard: {
          align: 'center',
          fill: '#f8fafc',
          fontSize: 18,
          maxWidth: 280,
          minWidth: 220,
          paddingX: 22,
          paddingY: 18,
          text: 'SIGNAL SOURCE REACHED',
          tone: 'dark',
          x: 220,
          y: 60
        },
        notesCard: {
          align: 'left',
          fill: '#0f172a',
          fontSize: 13,
          maxWidth: 240,
          minWidth: 180,
          paddingX: 18,
          paddingY: 14,
          text: 'Notebook clue summary',
          tone: 'light',
          x: 40,
          y: 140
        },
        routeCard: null
      },
      [{ color: '#f59e0b', r: 6, x: 120, y: 90 }]
    );

    expect(overlay.text).toBe('');
    expect(celebrationOverlay.text).toBe('SIGNAL SOURCE REACHED');
    expect(graphics.ops).toContainEqual({ kind: 'circle', x: 120, y: 90, r: 6 });
  });
});
