import { createBrowserShellApp } from './browserShellApp';
import {
  createBrowserShellAppDependencies,
  createBrowserShellRendererBindings,
  loadBrowserShellRendererModules,
  type BrowserShellRendererModules
} from './browserShellRenderer';
import {
  createBrowserShellRuntimeController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserShellRuntimeController
} from './browserShellRuntime';

export interface BrowserShellBootstrapDependencies {
  readonly createApp?: typeof createBrowserShellApp;
  readonly createRuntimeController?: typeof createBrowserShellRuntimeController;
  readonly createRendererBindings?: typeof createBrowserShellRendererBindings;
  readonly loadModules?: () => Promise<BrowserShellRendererModules>;
}

export async function bootstrapBrowserShell(
  shellWindow: BrowserShellHost = window,
  documentHost: BrowserDocumentHost = document,
  dependencies: BrowserShellBootstrapDependencies = {}
): Promise<void> {
  const createApp = dependencies.createApp ?? createBrowserShellApp;
  const createRuntimeController = dependencies.createRuntimeController ?? createBrowserShellRuntimeController;
  const createRendererBindings = dependencies.createRendererBindings ?? createBrowserShellRendererBindings;
  const modules = await (dependencies.loadModules ?? loadBrowserShellRendererModules)();

  const { app, sceneRendererContext, screenHeight, screenWidth } = await createApp(
    shellWindow,
    documentHost,
    createBrowserShellAppDependencies(modules)
  );
  const rendererBindings = createRendererBindings(modules, sceneRendererContext);

  const runtime = createRuntimeController({
    app,
    documentHost,
    renderMapScene: rendererBindings.renderMapScene,
    renderRunScene: rendererBindings.renderRunScene,
    screenHeight,
    screenWidth,
    shellWindow
  });

  runtime.drawInitialScene();
}

export type { BrowserDocumentHost, BrowserShellHost, BrowserShellRuntimeController };
