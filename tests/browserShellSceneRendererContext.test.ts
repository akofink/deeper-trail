import { describe, expect, it, vi } from 'vitest';
import type { Text } from 'pixi.js';
import type { SceneTextNodes } from '../src/game/render/sceneTextBootstrap';
import { createBrowserShellSceneRendererContext } from '../src/game/runtime/browserShellSceneRendererContext';

function createSceneTextNodesFixture(): SceneTextNodes {
  const label = { style: {}, text: '', x: 0, y: 0 } as Text;
  return {
    beaconLabels: [label, label, label],
    celebrationOverlay: label,
    chipLabels: [label, label, label, label, label, label],
    fieldNotesText: label,
    hud: label,
    mapLeftRowLabels: [label, label],
    mapLeftRowValues: [label, label],
    mapRightHeaderLines: [label, label],
    moduleLabels: [label, label, label, label, label, label],
    overlay: label,
    panelMeta: label,
    panelSeed: label,
    runLeftRowLabels: [label, label, label],
    runLeftRowValues: [label, label, label],
    runRightRowLabels: [label, label, label],
    runRightRowValues: [label, label],
    sharedSceneTextGroups: {
      beaconLabels: [label, label, label],
      chipLabels: [label, label, label, label, label, label],
      mapLeftRowLabels: [label, label],
      mapLeftRowValues: [label, label],
      mapRightHeaderLines: [label, label],
      runLeftRowLabels: [label, label, label],
      runLeftRowValues: [label, label, label],
      runRightRowLabels: [label, label, label],
      runRightRowValues: [label, label]
    }
  };
}

describe('browserShellSceneRendererContext', () => {
  it('allocates stage graphics, labels, and viewport accessors for the scene renderer', () => {
    const addChild = vi.fn();
    const stage = { addChild };
    const createSceneTextNodes = vi.fn(() => createSceneTextNodesFixture());

    class FakeGraphics {
      readonly kind = 'graphics';
    }

    class FakeText {
      constructor(readonly options: unknown) {}
    }

    const result = createBrowserShellSceneRendererContext(
      {
        screenHeight: () => 720,
        screenWidth: () => 1280,
        stage
      },
      {
        createSceneTextNodes,
        Graphics: FakeGraphics,
        Text: FakeText
      }
    );

    expect(addChild).toHaveBeenCalledTimes(2);
    expect(result.graphics).not.toBe(result.playerGraphics);
    expect(result.screenWidth()).toBe(1280);
    expect(result.screenHeight()).toBe(720);
    expect(createSceneTextNodes).toHaveBeenCalledTimes(1);
    expect(createSceneTextNodes).toHaveBeenCalledWith(stage, expect.any(Function));
    expect(result.labels).toBe(createSceneTextNodes.mock.results[0]?.value);
  });
});
