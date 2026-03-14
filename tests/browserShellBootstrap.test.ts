import { describe, expect, it, vi } from 'vitest';

import {
  bootstrapBrowserShell,
} from '../src/game/runtime/browserShellBootstrap';
import type {
  BrowserShellAppResult,
  BrowserShellPixiApplication,
  createBrowserShellApp
} from '../src/game/runtime/browserShellApp';
import type { SceneTextNodes } from '../src/game/render/sceneTextBootstrap';
import type { BrowserShellRendererModules } from '../src/game/runtime/browserShellRenderer';
import type {
  BrowserDocumentHost,
  BrowserShellHost,
  createBrowserShellRuntimeController
} from '../src/game/runtime/browserShellRuntime';
import type { RuntimeState } from '../src/game/runtime/runtimeState';

function createSceneTextNodesFixture(): SceneTextNodes {
  const label = { style: {}, text: '', x: 0, y: 0 } as SceneTextNodes['hud'];
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

describe('browserShellBootstrap', () => {
  it('loads modules, wires scene renderers, and draws the initial scene', async () => {
    const shellWindow = {
      addEventListener: vi.fn(),
      location: { search: '?seed=bootstrap-route' },
      requestAnimationFrame: vi.fn()
    } as unknown as BrowserShellHost;
    const documentHost = {
      exitFullscreen: vi.fn(async () => {}),
      fullscreenElement: null,
      querySelector: vi.fn()
    } as unknown as BrowserDocumentHost;
    const sceneRendererContext = {
      graphics: { kind: 'graphics' },
      labels: createSceneTextNodesFixture(),
      playerGraphics: { kind: 'playerGraphics' },
      screenHeight: () => 720,
      screenWidth: () => 1280
    } as unknown as BrowserShellAppResult['sceneRendererContext'];
    const app = {
      canvas: { requestFullscreen: vi.fn(async () => {}) },
      init: vi.fn(async () => {}),
      renderer: { render: vi.fn() },
      screen: { height: 720, width: 1280 },
      stage: { addChild: vi.fn() },
      ticker: { stop: vi.fn() }
    } satisfies BrowserShellPixiApplication;
    const appResult = {
      app,
      sceneRendererContext,
      screenHeight: () => 720,
      screenWidth: () => 1280
    } as BrowserShellAppResult;
    const createAppMock = vi.fn(async () => appResult);
    const createApp = createAppMock as unknown as typeof createBrowserShellApp;
    const drawInitialScene = vi.fn();
    let runtimeOptions:
      | Parameters<typeof createBrowserShellRuntimeController>[0]
      | undefined;
    const createRuntimeControllerMock = vi.fn((options: Parameters<typeof createBrowserShellRuntimeController>[0]) => {
      runtimeOptions = options;
      return {
      drawInitialScene,
      getState: vi.fn()
      };
    });
    const createRuntimeController =
      createRuntimeControllerMock as unknown as typeof createBrowserShellRuntimeController;
    const modules: BrowserShellRendererModules = {
      Application: class {
        constructor() {
          return app;
        }
      } as unknown as BrowserShellRendererModules['Application'],
      createSceneTextNodes: vi.fn(),
      drawMapScene: vi.fn(),
      drawRunScene: vi.fn(),
      Graphics: class {} as BrowserShellRendererModules['Graphics'],
      Text: class {} as BrowserShellRendererModules['Text']
    };
    const loadModules = vi.fn<() => Promise<BrowserShellRendererModules>>(async () => modules);

    await bootstrapBrowserShell(shellWindow, documentHost, {
      createApp,
      createRuntimeController,
      loadModules
    });

    expect(loadModules).toHaveBeenCalledOnce();
    expect(createAppMock).toHaveBeenCalledWith(shellWindow, documentHost, {
      Application: modules.Application,
      createSceneTextNodes: modules.createSceneTextNodes,
      Graphics: modules.Graphics,
      Text: modules.Text
    });
    expect(createRuntimeControllerMock).toHaveBeenCalledOnce();

    expect(runtimeOptions).toBeDefined();
    if (!runtimeOptions) {
      throw new Error('Expected runtime controller options.');
    }
    expect(runtimeOptions.app).toBe(appResult.app);
    expect(runtimeOptions.documentHost).toBe(documentHost);
    expect(runtimeOptions.screenHeight()).toBe(720);
    expect(runtimeOptions.screenWidth()).toBe(1280);
    expect(runtimeOptions.shellWindow).toBe(shellWindow);

    runtimeOptions.renderMapScene({ scene: 'map' } as RuntimeState);
    runtimeOptions.renderRunScene({ scene: 'run' } as RuntimeState);

    expect(modules.drawMapScene).toHaveBeenCalledWith({ scene: 'map' }, sceneRendererContext);
    expect(modules.drawRunScene).toHaveBeenCalledWith({ scene: 'run' }, sceneRendererContext);
    expect(drawInitialScene).toHaveBeenCalledOnce();
  });
});
