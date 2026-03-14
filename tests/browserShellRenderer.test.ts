import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserShellAppDependencies,
  createBrowserShellRendererBindings,
  type BrowserShellRendererModules
} from '../src/game/runtime/browserShellRenderer';
import type { SceneTextNodes } from '../src/game/render/sceneTextBootstrap';
import type { BrowserShellAppResult } from '../src/game/runtime/browserShellApp';
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

function createModules(): BrowserShellRendererModules {
  return {
    Application: class {} as BrowserShellRendererModules['Application'],
    createSceneTextNodes: vi.fn(),
    drawMapScene: vi.fn(),
    drawRunScene: vi.fn(),
    Graphics: class {} as BrowserShellRendererModules['Graphics'],
    Text: class {} as BrowserShellRendererModules['Text']
  };
}

describe('browserShellRenderer', () => {
  it('builds app dependencies from renderer modules', () => {
    const modules = createModules();

    expect(createBrowserShellAppDependencies(modules)).toEqual({
      Application: modules.Application,
      createSceneTextNodes: modules.createSceneTextNodes,
      Graphics: modules.Graphics,
      Text: modules.Text
    });
  });

  it('binds map and run scene renderers to the shared renderer context', () => {
    const modules = createModules();
    const sceneRendererContext = {
      graphics: { kind: 'graphics' },
      labels: createSceneTextNodesFixture(),
      playerGraphics: { kind: 'player-graphics' },
      screenHeight: () => 720,
      screenWidth: () => 1280
    } as unknown as BrowserShellAppResult['sceneRendererContext'];

    const bindings = createBrowserShellRendererBindings(modules, sceneRendererContext);

    bindings.renderMapScene({ scene: 'map' } as RuntimeState);
    bindings.renderRunScene({ scene: 'run' } as RuntimeState);

    expect(bindings.appDependencies).toEqual(createBrowserShellAppDependencies(modules));
    expect(modules.drawMapScene).toHaveBeenCalledWith({ scene: 'map' }, sceneRendererContext);
    expect(modules.drawRunScene).toHaveBeenCalledWith({ scene: 'run' }, sceneRendererContext);
  });
});
