import type { SceneRendererContext } from '../render/sceneRenderer';
import type { SceneTextNodeInit, SceneTextNodes } from '../render/sceneTextBootstrap';
import { createBrowserShellSceneRendererContext } from './browserShellSceneRendererContext';

interface BrowserShellAppRoot {
  appendChild: (node: unknown) => void;
}

interface BrowserShellAppDocumentHost {
  querySelector: <T>(selector: string) => T | null;
}

interface BrowserShellAppStage {
  addChild: (child: unknown) => void;
}

interface BrowserShellAppRenderer {
  render: (stage: unknown) => void;
}

interface BrowserShellAppTicker {
  stop: () => void;
}

interface BrowserShellAppScreen {
  width: number;
  height: number;
}

interface BrowserShellAppCanvas {
  requestFullscreen: () => Promise<void>;
}

export interface BrowserShellPixiApplication {
  init: (options?: object) => Promise<void>;
  canvas: BrowserShellAppCanvas;
  renderer: BrowserShellAppRenderer;
  screen: BrowserShellAppScreen;
  stage: BrowserShellAppStage;
  ticker: BrowserShellAppTicker;
}

export interface BrowserShellAppDependencies {
  readonly Application: new () => BrowserShellPixiApplication;
  readonly Graphics: new () => unknown;
  readonly Text: new (options: { text: string; style: SceneTextNodeInit['style'] }) => unknown;
  readonly createSceneTextNodes: (
    stage: BrowserShellAppStage,
    createText: (options: { text: string; style: SceneTextNodeInit['style'] }) => unknown
  ) => SceneTextNodes;
}

export interface BrowserShellAppResult {
  readonly app: BrowserShellPixiApplication;
  readonly sceneRendererContext: SceneRendererContext;
  readonly screenWidth: () => number;
  readonly screenHeight: () => number;
}

export async function createBrowserShellApp(
  shellWindow: unknown,
  documentHost: BrowserShellAppDocumentHost,
  dependencies: BrowserShellAppDependencies
): Promise<BrowserShellAppResult> {
  const app = new dependencies.Application();
  await app.init({ background: '#89c3f0', resizeTo: shellWindow, antialias: true });

  const root = documentHost.querySelector<BrowserShellAppRoot>('#app');
  if (!root) {
    throw new Error('Expected #app root element.');
  }

  root.appendChild(app.canvas);
  app.ticker.stop();

  const screenWidth = () => Math.max(1, app.screen.width);
  const screenHeight = () => Math.max(1, app.screen.height);
  const sceneRendererContext = createBrowserShellSceneRendererContext(
    {
      screenHeight,
      screenWidth,
      stage: app.stage
    },
    dependencies
  );

  return {
    app,
    sceneRendererContext,
    screenHeight,
    screenWidth
  };
}
