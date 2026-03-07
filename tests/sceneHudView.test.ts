import { describe, expect, it } from 'vitest';
import { buildModuleLabelLayouts, buildModuleMeterViews, buildPanelHeaderLayout } from '../src/game/runtime/sceneHudView';

describe('sceneHudView', () => {
  it('anchors panel header text to a shared inset', () => {
    const layout = buildPanelHeaderLayout(28);

    expect(layout).toEqual({
      metaX: 42,
      metaY: 34,
      seedX: 42,
      seedY: 46,
      titleX: 42,
      titleY: 16
    });
  });

  it('lays out module labels as a stable 3-column grid', () => {
    expect(buildModuleLabelLayouts(40, 100, 6)).toEqual([
      { x: 46, y: 109 },
      { x: 130, y: 109 },
      { x: 214, y: 109 },
      { x: 46, y: 145 },
      { x: 130, y: 145 },
      { x: 214, y: 145 }
    ]);
  });

  it('builds stable module meter cells and condition colors from vehicle state', () => {
    expect(
      buildModuleMeterViews(
        40,
        100,
        {
          frame: 2,
          engine: 4,
          scanner: 1,
          suspension: 3,
          storage: 2,
          shielding: 1
        },
        {
          frame: 3,
          engine: 2,
          scanner: 1,
          suspension: 3,
          storage: 2,
          shielding: 1
        }
      )
    ).toEqual([
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#34d399',
        conditionRatio: 1,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 0.5,
        subsystem: 'frame',
        x: 40,
        y: 100
      },
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#f59e0b',
        conditionRatio: 2 / 3,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 1,
        subsystem: 'engine',
        x: 124,
        y: 100
      },
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#ef4444',
        conditionRatio: 1 / 3,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 0.25,
        subsystem: 'scanner',
        x: 208,
        y: 100
      },
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#34d399',
        conditionRatio: 1,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 0.75,
        subsystem: 'suspension',
        x: 40,
        y: 136
      },
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#f59e0b',
        conditionRatio: 2 / 3,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 0.5,
        subsystem: 'storage',
        x: 124,
        y: 136
      },
      {
        cellHeight: 28,
        cellWidth: 76,
        conditionColor: '#ef4444',
        conditionRatio: 1 / 3,
        gaugeHeight: 6,
        gaugeWidth: 38,
        levelRatio: 0.25,
        subsystem: 'shielding',
        x: 208,
        y: 136
      }
    ]);
  });
});
