import { describe, expect, it, vi } from 'vitest';
import type { Text } from 'pixi.js';
import type { SceneTextNodes } from '../src/game/render/sceneTextBootstrap';
import {
  createBrowserShellApp,
  type BrowserShellAppDependencies,
  type BrowserShellPixiApplication
} from '../src/game/runtime/browserShellApp';

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

function createDependencies() {
  const init = vi.fn(async () => {});
  const stop = vi.fn();
  const addChild = vi.fn();
  const render = vi.fn();
  const requestFullscreen = vi.fn(async () => {});

  class FakeApplication implements BrowserShellPixiApplication {
    init = init;
    canvas = { requestFullscreen };
    renderer = { render };
    screen = { width: 1280, height: 720 };
    stage = { addChild };
    ticker = { stop };
  }

  const createSceneTextNodes = vi.fn(() => createSceneTextNodesFixture());

  class FakeText {
    constructor(readonly options: unknown) {}
  }

  const dependencies: BrowserShellAppDependencies = {
    Application: FakeApplication,
    createSceneTextNodes,
    Graphics: class {
      readonly kind = 'graphics';
    },
    Text: FakeText
  };

  return { addChild, createSceneTextNodes, dependencies, init, stop };
}

describe('browserShellApp', () => {
  it('builds the Pixi app shell and scene renderer context once', async () => {
    const shellWindow = { innerWidth: 1280 };
    const appendChild = vi.fn();
    const { addChild, createSceneTextNodes, dependencies, init, stop } = createDependencies();
    const documentHost = {
      querySelector: () => ({ appendChild })
    } as { querySelector: <T>(selector: string) => T | null };

    const result = await createBrowserShellApp(shellWindow, documentHost, dependencies);

    expect(init).toHaveBeenCalledWith({ antialias: true, background: '#89c3f0', resizeTo: shellWindow });
    expect(appendChild).toHaveBeenCalledWith(result.app.canvas);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(addChild).toHaveBeenCalledTimes(2);
    expect(createSceneTextNodes).toHaveBeenCalledTimes(1);
    expect(createSceneTextNodes).toHaveBeenCalledWith(result.app.stage, expect.any(Function));
    expect(result.sceneRendererContext.labels).toBe(createSceneTextNodes.mock.results[0]?.value);
    expect(result.sceneRendererContext.graphics).not.toBe(result.sceneRendererContext.playerGraphics);
    expect(result.screenWidth()).toBe(1280);
    expect(result.screenHeight()).toBe(720);
  });

  it('clamps screen accessors to one pixel minimum', async () => {
    const { dependencies } = createDependencies();
    const app = new dependencies.Application();
    app.screen.width = 0;
    app.screen.height = -20;
    const clampedDependencies: BrowserShellAppDependencies = {
      ...dependencies,
      Application: class {
        constructor() {
          return app;
        }
      } as BrowserShellAppDependencies['Application']
    };
    const documentHost = {
      querySelector: () => ({ appendChild: vi.fn() })
    } as { querySelector: <T>(selector: string) => T | null };

    const result = await createBrowserShellApp({}, documentHost, clampedDependencies);

    expect(result.screenWidth()).toBe(1);
    expect(result.screenHeight()).toBe(1);
    expect(result.sceneRendererContext.screenWidth()).toBe(1);
    expect(result.sceneRendererContext.screenHeight()).toBe(1);
  });

  it('throws when the #app root is missing', async () => {
    const { dependencies } = createDependencies();
    const documentHost = {
      querySelector: () => null
    } as { querySelector: <T>(selector: string) => T | null };

    await expect(createBrowserShellApp({}, documentHost, dependencies)).rejects.toThrow('Expected #app root element.');
  });
});
