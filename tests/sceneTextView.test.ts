import { describe, expect, it } from 'vitest';
import {
  buildCenteredTextView,
  buildChipLabelView,
  buildHudRowLabelView,
  buildHudRowValueView,
  buildModuleLabelTextViews,
  buildPanelHeaderTextViews,
  buildSceneTextCardMeasureView,
  buildSceneTextCardView,
  buildSceneTextCardWrappedMeasureView
} from '../src/game/runtime/sceneTextView';

describe('sceneTextView', () => {
  it('centers chip labels within the chip bounds', () => {
    const view = buildChipLabelView('ENTER\nTRAVEL', { width: 44, height: 18 }, 100, 200, 120, '#fff', 30);

    expect(view).toMatchObject({
      align: 'center',
      fill: '#fff',
      text: 'ENTER\nTRAVEL',
      x: 138,
      y: 206
    });
  });

  it('anchors hud rows on the left and right edges of a panel row', () => {
    expect(buildHudRowLabelView('FUEL', 24, 70, 12)).toMatchObject({
      fill: '#94a3b8',
      text: 'FUEL',
      x: 24,
      y: 64
    });
    expect(buildHudRowValueView('3/5', 180, 70, { width: 28, height: 12 })).toMatchObject({
      align: 'right',
      fill: '#e2e8f0',
      text: '3/5',
      x: 152,
      y: 64
    });
  });

  it('centers arbitrary labels from a measured midpoint', () => {
    const view = buildCenteredTextView('B1', 320, 240, { width: 20, height: 10 }, '#f8fafc');

    expect(view).toMatchObject({
      align: 'center',
      fill: '#f8fafc',
      text: 'B1',
      x: 310,
      y: 235
    });
  });

  it('maps missing module label slots to empty text views', () => {
    expect(buildModuleLabelTextViews([{ text: 'ENGINE', x: 10, y: 20 }, null])).toEqual([
      { fill: '#cbd5e1', text: 'ENGINE', x: 10, y: 20 },
      { fill: '#cbd5e1', text: '', x: 0, y: 0 }
    ]);
  });

  it('builds consistent header text styles from panel layout', () => {
    const views = buildPanelHeaderTextViews(
      { metaX: 12, metaY: 34, seedX: 12, seedY: 46, titleX: 12, titleY: 16 },
      { title: 'MAP', meta: 'Day 3 • Score 40', seed: 'Seed alpha' }
    );

    expect(views.title).toMatchObject({ fill: '#e2e8f0', fontSize: 18, x: 12, y: 16 });
    expect(views.meta).toMatchObject({ fill: '#cbd5e1', fontSize: 12, x: 12, y: 34 });
    expect(views.seed).toMatchObject({ fill: '#94a3b8', x: 12, y: 46 });
  });

  it('builds text-card measurement and final text placement views', () => {
    const card = {
      align: 'left',
      fill: '#e2e8f0',
      fontSize: 15,
      maxWidth: 320,
      minWidth: 220,
      paddingX: 18,
      paddingY: 16,
      text: 'Signal notes',
      tone: 'dark',
      x: 40,
      y: 120
    } as const;

    expect(buildSceneTextCardMeasureView(card)).toMatchObject({
      align: 'left',
      fill: '#e2e8f0',
      fontSize: 15,
      text: 'Signal notes',
      wordWrap: true,
      wordWrapWidth: 284,
      x: 0,
      y: 0
    });
    expect(buildSceneTextCardWrappedMeasureView(card, 260).wordWrapWidth).toBe(260);

    const view = buildSceneTextCardView(card, { width: 240, height: 48 });
    expect(view.cardWidth).toBe(276);
    expect(view.cardHeight).toBe(80);
    expect(view.text).toMatchObject({
      align: 'left',
      fill: '#e2e8f0',
      fontSize: 15,
      text: 'Signal notes',
      wordWrap: true,
      wordWrapWidth: 240,
      x: 58,
      y: 136
    });
  });
});
