import { describe, expect, it, vi } from 'vitest';
import type { Text } from 'pixi.js';

import { createSceneTextNodes, type SceneTextNodeInit } from '../src/game/render/sceneTextBootstrap';

function createFakeText(style: SceneTextNodeInit['style']): Text {
  return {
    style: { ...style },
    text: '',
    x: 0,
    y: 0
  } as Text;
}

describe('sceneTextBootstrap', () => {
  it('creates all scene labels and adds each one to the stage once', () => {
    const addChild = vi.fn();
    const stage = { addChild };

    const nodes = createSceneTextNodes(stage, ({ style }) => createFakeText(style));

    expect(addChild).toHaveBeenCalledTimes(38);
    expect(nodes.chipLabels).toHaveLength(6);
    expect(nodes.moduleLabels).toHaveLength(6);
    expect(nodes.beaconLabels).toHaveLength(3);
    expect(nodes.runLeftRowLabels).toHaveLength(3);
    expect(nodes.runLeftRowValues).toHaveLength(3);
    expect(nodes.runRightRowLabels).toHaveLength(3);
    expect(nodes.runRightRowValues).toHaveLength(2);
    expect(nodes.mapLeftRowLabels).toHaveLength(2);
    expect(nodes.mapLeftRowValues).toHaveLength(2);
    expect(nodes.mapRightHeaderLines).toHaveLength(2);
    expect(nodes.sharedSceneTextGroups.chipLabels).toBe(nodes.chipLabels);
    expect(nodes.sharedSceneTextGroups.beaconLabels).toBe(nodes.beaconLabels);
  });

  it('applies expected base styling and hud position defaults', () => {
    const stage = { addChild: vi.fn() };

    const nodes = createSceneTextNodes(stage, ({ style }) => createFakeText(style));

    expect(nodes.hud.x).toBe(16);
    expect(nodes.hud.y).toBe(12);
    expect(nodes.hud.style.fill).toBe('#12263a');
    expect(nodes.overlay.style.align).toBe('center');
    expect(nodes.panelSeed.style.align).toBe('right');
    expect(nodes.beaconLabels[0]?.style.align).toBe('center');
  });
});
