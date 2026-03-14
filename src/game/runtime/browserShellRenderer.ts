import type { Graphics } from 'pixi.js';
import type { SceneRendererContext } from '../render/sceneRenderer';
import type { BrowserShellAppDependencies } from './browserShellApp';
import type { BrowserShellRuntimeOptions } from './browserShellRuntime';

export interface BrowserShellRendererModules {
  readonly Application: BrowserShellAppDependencies['Application'];
  readonly Graphics: BrowserShellAppDependencies['Graphics'];
  readonly Text: BrowserShellAppDependencies['Text'];
  readonly createSceneTextNodes: BrowserShellAppDependencies['createSceneTextNodes'];
  readonly drawMapScene: (
    state: Parameters<BrowserShellRuntimeOptions['renderMapScene']>[0],
    context: SceneRendererContext
  ) => void;
  readonly drawRunScene: (
    state: Parameters<BrowserShellRuntimeOptions['renderRunScene']>[0],
    context: SceneRendererContext
  ) => void;
}

export interface BrowserShellRendererBindings {
  readonly appDependencies: BrowserShellAppDependencies;
  readonly renderMapScene: BrowserShellRuntimeOptions['renderMapScene'];
  readonly renderRunScene: BrowserShellRuntimeOptions['renderRunScene'];
}

export async function loadBrowserShellRendererModules(): Promise<BrowserShellRendererModules> {
  const [{ Application, Graphics, Text }, { createSceneTextNodes }, { drawMapScene, drawRunScene }] = await Promise.all([
    import('pixi.js'),
    import('../render/sceneTextBootstrap'),
    import('../render/sceneRenderer')
  ]);

  return {
    Application: Application as BrowserShellAppDependencies['Application'],
    createSceneTextNodes: createSceneTextNodes as BrowserShellAppDependencies['createSceneTextNodes'],
    drawMapScene,
    drawRunScene,
    Graphics,
    Text: Text as BrowserShellAppDependencies['Text']
  };
}

export function createBrowserShellRendererBindings(
  modules: BrowserShellRendererModules,
  sceneRendererContext: SceneRendererContext
): BrowserShellRendererBindings {
  return {
    appDependencies: createBrowserShellAppDependencies(modules),
    renderMapScene: (state) => {
      modules.drawMapScene(state, sceneRendererContext);
    },
    renderRunScene: (state) => {
      modules.drawRunScene(state, sceneRendererContext);
    }
  };
}

export function createBrowserShellAppDependencies(modules: BrowserShellRendererModules): BrowserShellAppDependencies {
  return {
    Application: modules.Application,
    createSceneTextNodes: modules.createSceneTextNodes,
    Graphics: modules.Graphics,
    Text: modules.Text
  };
}

export type { Graphics };
