import type { BrowserShellWindow } from './browserShellSession';
import {
  createBrowserShellRuntimeFactory,
  type BrowserShellRuntimeFactoryDependencies
} from './browserShellRuntimeFactory';
import type { RuntimeState } from './runtimeState';

export interface BrowserShellHost extends BrowserShellWindow {
  addEventListener: Window['addEventListener'];
  requestAnimationFrame: Window['requestAnimationFrame'];
}

export interface BrowserDocumentHost {
  querySelector: Document['querySelector'];
  fullscreenElement: Document['fullscreenElement'];
  exitFullscreen: Document['exitFullscreen'];
}

export interface BrowserShellRuntimeApp {
  readonly canvas: {
    requestFullscreen: () => Promise<void>;
  };
  readonly renderer: {
    render: (stage: unknown) => void;
  };
  readonly screen: {
    height: number;
  };
  readonly stage: unknown;
}

export interface BrowserShellRuntimeController {
  readonly drawInitialScene: () => void;
  readonly getState: () => RuntimeState;
}

export interface BrowserShellRuntimeOptions {
  readonly app: BrowserShellRuntimeApp;
  readonly documentHost: BrowserDocumentHost;
  readonly renderMapScene: (state: RuntimeState) => void;
  readonly renderRunScene: (state: RuntimeState) => void;
  readonly screenHeight: () => number;
  readonly screenWidth: () => number;
  readonly shellWindow: BrowserShellHost;
}

export interface BrowserShellRuntimeDependencies extends BrowserShellRuntimeFactoryDependencies {}

export function createBrowserShellRuntimeController(
  options: BrowserShellRuntimeOptions,
  dependencies: BrowserShellRuntimeDependencies = {}
): BrowserShellRuntimeController {
  const runtime = createBrowserShellRuntimeFactory(options, dependencies);

  return {
    drawInitialScene: () => {
      runtime.drawScene();
      options.app.renderer.render(options.app.stage);
    },
    getState: runtime.stateController.getState
  };
}
