import { getMaxHealth } from '../../engine/sim/vehicle';
import {
  createBrowserShellRuntimeLoopController,
  type BrowserShellRuntimeLoopControllerDependencies
} from './browserShellRuntimeLoopController';
import { buildDebugStateSnapshot } from './debugState';
import { stepMapScene } from './mapSceneFlow';
import { createShellEventBridge } from './shellEventBridge';
import { stepRunState } from './runStep';
import { createInitialRuntimeState, type RuntimeState } from './runtimeState';

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
  readonly buildDebugStateSnapshot?: typeof buildDebugStateSnapshot;
  readonly createBrowserShellRuntimeLoopController?: typeof createBrowserShellRuntimeLoopController;
  readonly createEventBridge?: typeof createShellEventBridge;
  readonly createFrameLoopController?: BrowserShellRuntimeLoopControllerDependencies['createFrameLoopController'];
  readonly createInitialRuntimeState?: typeof createInitialRuntimeState;
  readonly createSeed?: typeof createRunSeed;
  readonly getMaxHealth?: typeof getMaxHealth;
  readonly bindShellRuntimeLoop?: BrowserShellRuntimeLoopControllerDependencies['bindShellRuntimeLoop'];
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
  const createRuntimeLoopController =
    dependencies.createBrowserShellRuntimeLoopController ?? createBrowserShellRuntimeLoopController;
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

  const runtimeLoop = createRuntimeLoopController(
    {
      app: options.app,
      documentHost: options.documentHost,
      getState: () => state,
      renderMapScene: options.renderMapScene,
      renderRunScene: options.renderRunScene,
      screenWidth: options.screenWidth,
      shellEventBridge,
      shellWindow: options.shellWindow
    },
    {
      bindShellRuntimeLoop: dependencies.bindShellRuntimeLoop,
      createFrameLoopController: dependencies.createFrameLoopController,
      stepMapScene: mapStep,
      stepRunState: runStep
    }
  );

  attachDebugHooks(options.shellWindow, {
    renderGameToText: () => JSON.stringify(buildSnapshot(state, options.screenWidth(), resolveMaxHealth(state.sim.vehicle))),
    advanceTime: runtimeLoop.advanceTime
  });

  return {
    drawInitialScene: () => {
      drawInitialScene(state, options.renderMapScene, options.renderRunScene);
      options.app.renderer.render(options.app.stage);
    },
    getState: () => state
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
