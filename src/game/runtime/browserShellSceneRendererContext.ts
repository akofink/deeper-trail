import type { Graphics } from 'pixi.js';
import type { SceneRendererContext } from '../render/sceneRenderer';
import type { SceneTextNodeInit, SceneTextNodes } from '../render/sceneTextBootstrap';

interface BrowserShellSceneRendererStage {
  addChild: (child: unknown) => void;
}

export interface BrowserShellSceneRendererContextOptions {
  readonly stage: BrowserShellSceneRendererStage;
  readonly screenHeight: () => number;
  readonly screenWidth: () => number;
}

export interface BrowserShellSceneRendererContextDependencies {
  readonly Graphics: new () => unknown;
  readonly Text: new (options: { text: string; style: SceneTextNodeInit['style'] }) => unknown;
  readonly createSceneTextNodes: (
    stage: BrowserShellSceneRendererStage,
    createText: (options: { text: string; style: SceneTextNodeInit['style'] }) => unknown
  ) => SceneTextNodes;
}

export function createBrowserShellSceneRendererContext(
  options: BrowserShellSceneRendererContextOptions,
  dependencies: BrowserShellSceneRendererContextDependencies
): SceneRendererContext {
  const graphics = new dependencies.Graphics();
  options.stage.addChild(graphics);

  const playerGraphics = new dependencies.Graphics();
  options.stage.addChild(playerGraphics);

  const labels = dependencies.createSceneTextNodes(options.stage, (textOptions) => new dependencies.Text(textOptions));

  return {
    graphics: graphics as Graphics,
    labels,
    playerGraphics: playerGraphics as Graphics,
    screenHeight: options.screenHeight,
    screenWidth: options.screenWidth
  };
}
