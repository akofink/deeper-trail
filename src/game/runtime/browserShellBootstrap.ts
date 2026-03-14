import type { Graphics } from 'pixi.js';
import { createBrowserShellApp, type BrowserShellAppDependencies } from './browserShellApp';
import {
  createBrowserShellRuntimeController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserShellRuntimeController
} from './browserShellRuntime';

export interface BrowserShellBootstrapModules {
  readonly Application: BrowserShellAppDependencies['Application'];
  readonly Graphics: BrowserShellAppDependencies['Graphics'];
  readonly Text: BrowserShellAppDependencies['Text'];
  readonly createSceneTextNodes: BrowserShellAppDependencies['createSceneTextNodes'];
  readonly drawMapScene: (state: Parameters<BrowserShellRuntimeOptions['renderMapScene']>[0], context: SceneRendererContext) => void;
  readonly drawRunScene: (state: Parameters<BrowserShellRuntimeOptions['renderRunScene']>[0], context: SceneRendererContext) => void;
}

interface SceneRendererContext {
  readonly graphics: Graphics;
  readonly labels: BrowserShellAppResult['sceneRendererContext']['labels'];
  readonly playerGraphics: Graphics;
  readonly screenHeight: () => number;
  readonly screenWidth: () => number;
}

interface BrowserShellAppResult {
  readonly app: Awaited<ReturnType<typeof createBrowserShellApp>>['app'];
  readonly sceneRendererContext: Awaited<ReturnType<typeof createBrowserShellApp>>['sceneRendererContext'];
  readonly screenHeight: () => number;
  readonly screenWidth: () => number;
}

interface BrowserShellRuntimeOptions {
  readonly renderMapScene: Parameters<typeof createBrowserShellRuntimeController>[0]['renderMapScene'];
  readonly renderRunScene: Parameters<typeof createBrowserShellRuntimeController>[0]['renderRunScene'];
}

export interface BrowserShellBootstrapDependencies {
  readonly createApp?: typeof createBrowserShellApp;
  readonly createRuntimeController?: typeof createBrowserShellRuntimeController;
  readonly loadModules?: () => Promise<BrowserShellBootstrapModules>;
}

export async function loadBrowserShellModules(): Promise<BrowserShellBootstrapModules> {
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

export async function bootstrapBrowserShell(
  shellWindow: BrowserShellHost = window,
  documentHost: BrowserDocumentHost = document,
  dependencies: BrowserShellBootstrapDependencies = {}
): Promise<void> {
  const createApp = dependencies.createApp ?? createBrowserShellApp;
  const createRuntimeController = dependencies.createRuntimeController ?? createBrowserShellRuntimeController;
  const modules = await (dependencies.loadModules ?? loadBrowserShellModules)();

  const { app, sceneRendererContext, screenHeight, screenWidth } = await createApp(shellWindow, documentHost, {
    Application: modules.Application,
    createSceneTextNodes: modules.createSceneTextNodes,
    Graphics: modules.Graphics,
    Text: modules.Text
  });

  const runtime = createRuntimeController({
    app,
    documentHost,
    renderMapScene: (state) => {
      modules.drawMapScene(state, sceneRendererContext);
    },
    renderRunScene: (state) => {
      modules.drawRunScene(state, sceneRendererContext);
    },
    screenHeight,
    screenWidth,
    shellWindow
  });

  runtime.drawInitialScene();
}

export type { BrowserDocumentHost, BrowserShellHost, BrowserShellRuntimeController };
