import type { getMaxHealth } from '../../engine/sim/vehicle';
import {
  createBrowserShellRuntimeLoopController,
  type BrowserShellRuntimeLoopControllerDependencies
} from './browserShellRuntimeLoopController';
import {
  attachBrowserShellRuntimeDebugHooks,
  createBrowserShellStateController,
  createRunSeed,
  type BrowserShellWindow
} from './browserShellSession';
import { stepMapScene } from './mapSceneFlow';
import { createShellEventBridge } from './shellEventBridge';
import { stepRunState } from './runStep';
import type { createInitialRuntimeState, RuntimeState } from './runtimeState';

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

export interface BrowserShellRuntimeDependencies {
  readonly attachBrowserShellRuntimeDebugHooks?: typeof attachBrowserShellRuntimeDebugHooks;
  readonly createBrowserShellRuntimeLoopController?: typeof createBrowserShellRuntimeLoopController;
  readonly createBrowserShellStateController?: typeof createBrowserShellStateController;
  readonly createEventBridge?: typeof createShellEventBridge;
  readonly createFrameLoopController?: BrowserShellRuntimeLoopControllerDependencies['createFrameLoopController'];
  readonly createSeed?: typeof createRunSeed;
  readonly getMaxHealth?: typeof getMaxHealth;
  readonly bindShellRuntimeLoop?: BrowserShellRuntimeLoopControllerDependencies['bindShellRuntimeLoop'];
  readonly createInitialRuntimeState?: typeof createInitialRuntimeState;
  readonly stepMapScene?: typeof stepMapScene;
  readonly stepRunState?: typeof stepRunState;
}

export function createBrowserShellRuntimeController(
  options: BrowserShellRuntimeOptions,
  dependencies: BrowserShellRuntimeDependencies = {}
): BrowserShellRuntimeController {
  const createStateController = dependencies.createBrowserShellStateController ?? createBrowserShellStateController;
  const createEventBridge = dependencies.createEventBridge ?? createShellEventBridge;
  const createRuntimeLoopController =
    dependencies.createBrowserShellRuntimeLoopController ?? createBrowserShellRuntimeLoopController;
  const runStep = dependencies.stepRunState ?? stepRunState;
  const mapStep = dependencies.stepMapScene ?? stepMapScene;
  const attachRuntimeDebugHooks =
    dependencies.attachBrowserShellRuntimeDebugHooks ?? attachBrowserShellRuntimeDebugHooks;
  const createSeed = dependencies.createSeed ?? createRunSeed;

  const stateController = createStateController(options.app.screen.height, options.shellWindow, {
    createInitialRuntimeState: dependencies.createInitialRuntimeState,
    createSeed
  });
  const shellEventBridge = createEventBridge({
    createSeed,
    getCanvasHeight: options.screenHeight,
    getState: stateController.getState,
    setState: stateController.setState
  });

  const runtimeLoop = createRuntimeLoopController(
    {
      app: options.app,
      documentHost: options.documentHost,
      getState: stateController.getState,
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

  attachRuntimeDebugHooks(options.shellWindow, stateController, options.screenWidth, runtimeLoop.advanceTime, {
    getMaxHealth: dependencies.getMaxHealth
  });

  return {
    drawInitialScene: () => {
      drawInitialScene(stateController.getState(), options.renderMapScene, options.renderRunScene);
      options.app.renderer.render(options.app.stage);
    },
    getState: stateController.getState
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
