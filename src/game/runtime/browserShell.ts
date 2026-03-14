import { createBrowserShellApp, type BrowserShellAppDependencies } from './browserShellApp';
import {
  createBrowserShellRuntimeController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserCryptoHost,
  type BrowserShellWindow,
  createRunSeed,
  initialSeedFromSearch,
  initialSeedFromWindow,
  attachDebugWindowHooks
} from './browserShellRuntime';

export type { BrowserCryptoHost, BrowserDocumentHost, BrowserShellHost, BrowserShellWindow };
export { attachDebugWindowHooks, createRunSeed, initialSeedFromSearch, initialSeedFromWindow };

export async function bootstrapBrowserShell(
  shellWindow: BrowserShellHost = window,
  documentHost: BrowserDocumentHost = document
): Promise<void> {
  const [{ Application, Graphics, Text }, { createSceneTextNodes }, { drawMapScene: renderMapScene, drawRunScene: renderRunScene }] =
    await Promise.all([
      import('pixi.js'),
      import('../render/sceneTextBootstrap'),
      import('../render/sceneRenderer')
    ]);

  const { app, sceneRendererContext, screenHeight, screenWidth } = await createBrowserShellApp(shellWindow, documentHost, {
    Application: Application as BrowserShellAppDependencies['Application'],
    createSceneTextNodes: createSceneTextNodes as BrowserShellAppDependencies['createSceneTextNodes'],
    Graphics,
    Text: Text as BrowserShellAppDependencies['Text']
  });

  const runtime = createBrowserShellRuntimeController({
    app,
    documentHost,
    renderMapScene: (state) => {
      renderMapScene(state, sceneRendererContext);
    },
    renderRunScene: (state) => {
      renderRunScene(state, sceneRendererContext);
    },
    screenHeight,
    screenWidth,
    shellWindow
  });

  runtime.drawInitialScene();
}
