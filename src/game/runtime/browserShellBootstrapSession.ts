import { createBrowserShellApp, type BrowserShellAppResult } from './browserShellApp';
import {
  createBrowserShellAppDependencies,
  createBrowserShellRendererBindings,
  loadBrowserShellRendererModules,
  type BrowserShellRendererBindings,
  type BrowserShellRendererModules
} from './browserShellRenderer';
import {
  createBrowserShellRuntimeController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserShellRuntimeController
} from './browserShellRuntime';

export interface BrowserShellBootstrapSessionDependencies {
  readonly createApp?: typeof createBrowserShellApp;
  readonly createRendererBindings?: typeof createBrowserShellRendererBindings;
  readonly createRuntimeController?: typeof createBrowserShellRuntimeController;
  readonly loadModules?: () => Promise<BrowserShellRendererModules>;
}

export interface BrowserShellBootstrapSessionResult {
  readonly app: BrowserShellAppResult['app'];
  readonly rendererBindings: BrowserShellRendererBindings;
  readonly runtime: BrowserShellRuntimeController;
}

export async function createBrowserShellBootstrapSession(
  shellWindow: BrowserShellHost,
  documentHost: BrowserDocumentHost,
  dependencies: BrowserShellBootstrapSessionDependencies = {}
): Promise<BrowserShellBootstrapSessionResult> {
  const createApp = dependencies.createApp ?? createBrowserShellApp;
  const createRuntimeController = dependencies.createRuntimeController ?? createBrowserShellRuntimeController;
  const createRendererBindings = dependencies.createRendererBindings ?? createBrowserShellRendererBindings;
  const modules = await (dependencies.loadModules ?? loadBrowserShellRendererModules)();

  const appResult = await createApp(shellWindow, documentHost, createBrowserShellAppDependencies(modules));
  const rendererBindings = createRendererBindings(modules, appResult.sceneRendererContext);
  const runtime = createRuntimeController({
    app: appResult.app,
    documentHost,
    renderMapScene: rendererBindings.renderMapScene,
    renderRunScene: rendererBindings.renderRunScene,
    screenHeight: appResult.screenHeight,
    screenWidth: appResult.screenWidth,
    shellWindow
  });

  return {
    app: appResult.app,
    rendererBindings,
    runtime
  };
}

export type { BrowserDocumentHost, BrowserShellHost, BrowserShellRuntimeController };
