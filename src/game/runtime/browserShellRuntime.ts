import { getMaxHealth } from '../../engine/sim/vehicle';
import { buildDebugStateSnapshot } from './debugState';
import { createFrameLoopController } from './frameLoop';
import { stepMapScene } from './mapSceneFlow';
import { bindShellRuntimeLoop } from './shellRuntimeLoop';
import { createShellEventBridge, type ShellEventBridge } from './shellEventBridge';
import { stepRunState } from './runStep';
import { createInitialRuntimeState, type RuntimeState } from './runtimeState';

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

export interface BrowserShellRuntimeDependencies {
  readonly attachDebugWindowHooks?: typeof attachDebugWindowHooks;
  readonly bindShellRuntimeLoop?: typeof bindShellRuntimeLoop;
  readonly buildDebugStateSnapshot?: typeof buildDebugStateSnapshot;
  readonly createEventBridge?: typeof createShellEventBridge;
  readonly createFrameLoopController?: typeof createFrameLoopController;
  readonly createInitialRuntimeState?: typeof createInitialRuntimeState;
  readonly createSeed?: typeof createRunSeed;
  readonly getMaxHealth?: typeof getMaxHealth;
  readonly stepMapScene?: typeof stepMapScene;
  readonly stepRunState?: typeof stepRunState;
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

export function createBrowserShellRuntimeController(
  options: BrowserShellRuntimeOptions,
  dependencies: BrowserShellRuntimeDependencies = {}
): BrowserShellRuntimeController {
  const createInitialState = dependencies.createInitialRuntimeState ?? createInitialRuntimeState;
  const createEventBridge = dependencies.createEventBridge ?? createShellEventBridge;
  const createFrameLoop = dependencies.createFrameLoopController ?? createFrameLoopController;
  const bindRuntimeLoop = dependencies.bindShellRuntimeLoop ?? bindShellRuntimeLoop;
  const runStep = dependencies.stepRunState ?? stepRunState;
  const mapStep = dependencies.stepMapScene ?? stepMapScene;
  const buildSnapshot = dependencies.buildDebugStateSnapshot ?? buildDebugStateSnapshot;
  const resolveMaxHealth = dependencies.getMaxHealth ?? getMaxHealth;
  const attachDebugHooks = dependencies.attachDebugWindowHooks ?? attachDebugWindowHooks;
  const createSeed = dependencies.createSeed ?? createRunSeed;

  let state = createInitialState(options.app.screen.height, initialSeedFromWindow(options.shellWindow) ?? createSeed());
  const shellEventBridge = createEventBridge({
    createSeed,
    getCanvasHeight: options.screenHeight,
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    }
  });

  const frameLoop = createFrameLoop(FIXED_DT, {
    currentScene: () => state.scene,
    drawMap: () => drawScene(state, options.renderMapScene),
    drawRun: () => drawScene(state, options.renderRunScene),
    renderFrame: () => {
      options.app.renderer.render(options.app.stage);
    },
    stepMap: (dt) => {
      mapStep(state, dt, shellEventBridge.mapRotateInput());
    },
    stepRun: buildRunStep(() => state, shellEventBridge, options.screenWidth, runStep)
  });

  bindRuntimeLoop(options.shellWindow, {
    onAnimationFrame: frameLoop.onAnimationFrame,
    onKeyDown: shellEventBridge.onKeyDown,
    onKeyUp: shellEventBridge.onKeyUp,
    onResize: shellEventBridge.onResize,
    onToggleFullscreen: async () => {
      await toggleFullscreen(options.app, options.documentHost);
    }
  });

  attachDebugHooks(options.shellWindow, {
    renderGameToText: () => JSON.stringify(buildSnapshot(state, options.screenWidth(), resolveMaxHealth(state.sim.vehicle))),
    advanceTime: frameLoop.advanceTime
  });

  return {
    drawInitialScene: () => {
      drawInitialScene(state, options.renderMapScene, options.renderRunScene);
      options.app.renderer.render(options.app.stage);
    },
    getState: () => state
  };
}

function buildRunStep(
  getState: () => RuntimeState,
  shellEventBridge: ShellEventBridge,
  screenWidth: () => number,
  runStep: typeof stepRunState
): (dt: number) => void {
  return (dt: number): void => {
    const state = getState();
    const input = shellEventBridge.buildRunStepInputSnapshot();
    const result = runStep(state, { dt, screenWidth: screenWidth(), ...input });
    shellEventBridge.updateRunStepInputResult(result);
  };
}

function drawInitialScene(
  state: RuntimeState,
  renderMapScene: (state: RuntimeState) => void,
  renderRunScene: (state: RuntimeState) => void
): void {
  if (state.scene === 'map') {
    renderMapScene(state);
    return;
  }

  renderRunScene(state);
}

function drawScene(state: RuntimeState, render: (state: RuntimeState) => void): void {
  render(state);
}

async function toggleFullscreen(app: BrowserShellRuntimeApp, documentHost: BrowserDocumentHost): Promise<void> {
  if (!documentHost.fullscreenElement) {
    await app.canvas.requestFullscreen();
    return;
  }

  await documentHost.exitFullscreen();
}
