import { describe, expect, it } from 'vitest';
import {
  buildCenteredTextView,
  buildCenteredTextViews,
  buildChipLabelTextViews,
  buildChipLabelView,
  buildHudRowLabelView,
  buildHudRowTextViews,
  buildHudRowValueView,
  buildModuleLabelTextViews,
  buildPanelHeaderTextViews,
  buildSceneTextCardMeasureView,
  buildSceneTextCardView,
  buildSceneTextCardWrappedMeasureView,
  buildStackedHudLabelViews
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

  it('builds centered text views for a list of labels', () => {
    expect(
      buildCenteredTextViews(
        [
          { fill: '#fff', text: 'B1', x: 100, y: 80 },
          { fill: '#0ff', text: 'B2', x: 220, y: 140 }
        ],
        [
          { width: 18, height: 10 },
          { width: 22, height: 12 }
        ]
      )
    ).toEqual([
      { align: 'center', fill: '#fff', text: 'B1', x: 91, y: 75 },
      { align: 'center', fill: '#0ff', text: 'B2', x: 209, y: 134 }
    ]);
  });

  it('maps missing module label slots to empty text views', () => {
    expect(buildModuleLabelTextViews([{ text: 'ENGINE', x: 10, y: 20 }, null])).toEqual([
      { fill: '#cbd5e1', text: 'ENGINE', x: 10, y: 20 },
      { fill: '#cbd5e1', text: '', x: 0, y: 0 }
    ]);
  });

  it('builds paired hud row label and value views from measured rows', () => {
    expect(
      buildHudRowTextViews(
        [
          { label: 'DAY', value: '3', y: 50 },
          { label: 'FUEL', value: '4/6', y: 74 }
        ],
        20,
        180,
        [
          { width: 18, height: 10 },
          { width: 24, height: 12 }
        ],
        [
          { width: 8, height: 10 },
          { width: 28, height: 12 }
        ]
      )
    ).toEqual({
      labelViews: [
        { fill: '#94a3b8', text: 'DAY', x: 20, y: 45 },
        { fill: '#94a3b8', text: 'FUEL', x: 20, y: 68 }
      ],
      valueViews: [
        { align: 'right', fill: '#e2e8f0', text: '3', x: 172, y: 45 },
        { align: 'right', fill: '#e2e8f0', text: '4/6', x: 152, y: 68 }
      ]
    });
  });

  it('builds stacked hud labels and chip labels in batches', () => {
    expect(
      buildStackedHudLabelViews(
        ['VEHICLE', 'Condition avg 4.2'],
        320,
        [40, 58],
        [
          { width: 60, height: 12 },
          { width: 96, height: 10 }
        ]
      )
    ).toEqual([
      { fill: '#94a3b8', text: 'VEHICLE', x: 320, y: 34 },
      { fill: '#94a3b8', text: 'Condition avg 4.2', x: 320, y: 53 }
    ]);

    expect(
      buildChipLabelTextViews(
        [
          { height: 30, label: 'Enter\nTravel', labelFill: '#64748b', w: 88, x: 40, y: 400 },
          { height: 24, label: 'A\nMap', labelFill: '#dbeafe', w: 82, x: 140, y: 404 }
        ],
        [
          { width: 36, height: 18 },
          { width: 26, height: 16 }
        ]
      )
    ).toEqual([
      { align: 'center', fill: '#64748b', text: 'Enter\nTravel', x: 66, y: 406 },
      { align: 'center', fill: '#dbeafe', text: 'A\nMap', x: 168, y: 408 }
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
