import { describe, expect, it } from 'vitest';
import { buildModuleLabelLayouts, buildPanelHeaderLayout } from '../src/game/runtime/sceneHudView';

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
});
