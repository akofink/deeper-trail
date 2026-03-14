import { getMaxHealth } from '../../engine/sim/vehicle';
import { buildDebugStateSnapshot } from './debugState';
import { createBrowserShellApp, type BrowserShellAppDependencies } from './browserShellApp';
import { createFrameLoopController } from './frameLoop';
import { stepMapScene } from './mapSceneFlow';
import { bindShellRuntimeLoop } from './shellRuntimeLoop';
import { createShellEventBridge } from './shellEventBridge';
import { stepRunState } from './runStep';
import { createInitialRuntimeState } from './runtimeState';

const FIXED_DT = 1 / 60;

export interface BrowserShellWindow {
  location: Pick<Location, 'search'>;
  render_game_to_text?: () => string;
  advanceTime?: (ms: number) => void;
}

export interface BrowserShellHost extends BrowserShellWindow {
  addEventListener: Window['addEventListener'];
  requestAnimationFrame: Window['requestAnimationFrame'];
}

export interface BrowserDocumentHost {
  querySelector: Document['querySelector'];
  fullscreenElement: Document['fullscreenElement'];
  exitFullscreen: Document['exitFullscreen'];
}

export interface BrowserCryptoHost {
  randomUUID?: () => string;
}

export function createRunSeed(
  cryptoHost: BrowserCryptoHost | null | undefined = globalThis.crypto,
  now: () => number = Date.now,
  random: () => number = Math.random
): string {
  if (typeof cryptoHost?.randomUUID === 'function') {
    return cryptoHost.randomUUID().slice(0, 8);
  }
  return `${now().toString(36)}-${Math.floor(random() * 1679616)
    .toString(36)
    .padStart(4, '0')}`;
}

export function initialSeedFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get('seed')?.trim();
  return value ? value : undefined;
}

export function initialSeedFromWindow(shellWindow: BrowserShellWindow): string | undefined {
  return initialSeedFromSearch(shellWindow.location.search);
}

export function attachDebugWindowHooks(
  shellWindow: BrowserShellWindow,
  hooks: {
    renderGameToText: () => string;
    advanceTime: (ms: number) => void;
  }
): void {
  shellWindow.render_game_to_text = hooks.renderGameToText;
  shellWindow.advanceTime = hooks.advanceTime;
}

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

  let state = createInitialRuntimeState(app.screen.height, initialSeedFromWindow(shellWindow) ?? createRunSeed());
  const shellEventBridge = createShellEventBridge({
    createSeed: createRunSeed,
    getCanvasHeight: screenHeight,
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    }
  });

  function stepRun(dt: number): void {
    const input = shellEventBridge.buildRunStepInputSnapshot();
    const result = stepRunState(state, { dt, screenWidth: screenWidth(), ...input });
    shellEventBridge.updateRunStepInputResult(result);
  }

  function drawRunScene(): void {
    renderRunScene(state, sceneRendererContext);
  }

  function drawMapScene(): void {
    renderMapScene(state, sceneRendererContext);
  }

  async function toggleFullscreen(): Promise<void> {
    if (!documentHost.fullscreenElement) {
      await app.canvas.requestFullscreen();
      return;
    }
    await documentHost.exitFullscreen();
  }

  const frameLoop = createFrameLoopController(FIXED_DT, {
    currentScene: () => state.scene,
    drawMap: drawMapScene,
    drawRun: drawRunScene,
    renderFrame: () => {
      app.renderer.render(app.stage);
    },
    stepMap: (dt) => {
      stepMapScene(state, dt, shellEventBridge.mapRotateInput());
    },
    stepRun
  });

  bindShellRuntimeLoop(shellWindow, {
    onAnimationFrame: frameLoop.onAnimationFrame,
    onKeyDown: shellEventBridge.onKeyDown,
    onKeyUp: shellEventBridge.onKeyUp,
    onResize: shellEventBridge.onResize,
    onToggleFullscreen: toggleFullscreen
  });

  attachDebugWindowHooks(shellWindow, {
    renderGameToText: () => JSON.stringify(buildDebugStateSnapshot(state, screenWidth(), getMaxHealth(state.sim.vehicle))),
    advanceTime: frameLoop.advanceTime
  });

  drawRunScene();
  app.renderer.render(app.stage);
}
