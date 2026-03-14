import {
  createBrowserShellBootstrapSession,
  type BrowserShellBootstrapSessionDependencies,
  type BrowserShellBootstrapSessionResult,
  type BrowserDocumentHost,
  type BrowserShellHost
} from './browserShellBootstrapSession';

export interface BrowserShellBootstrapDependencies extends BrowserShellBootstrapSessionDependencies {
  readonly createBrowserShellBootstrapSession?: typeof createBrowserShellBootstrapSession;
}

export async function bootstrapBrowserShell(
  shellWindow: BrowserShellHost = window,
  documentHost: BrowserDocumentHost = document,
  dependencies: BrowserShellBootstrapDependencies = {}
): Promise<void> {
  const createSession = dependencies.createBrowserShellBootstrapSession ?? createBrowserShellBootstrapSession;
  const sessionDependencies: BrowserShellBootstrapSessionDependencies = {
    createApp: dependencies.createApp,
    createRendererBindings: dependencies.createRendererBindings,
    createRuntimeController: dependencies.createRuntimeController,
    loadModules: dependencies.loadModules
  };
  const { runtime } = await createSession(
    shellWindow,
    documentHost,
    sessionDependencies
  ) as BrowserShellBootstrapSessionResult;

  runtime.drawInitialScene();
}

export type {
  BrowserDocumentHost,
  BrowserShellHost,
  BrowserShellRuntimeController
} from './browserShellBootstrapSession';
