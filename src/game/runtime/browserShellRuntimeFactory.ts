import type { getMaxHealth } from '../../engine/sim/vehicle';
import {
  createBrowserShellRuntimeLoopController,
  type BrowserShellRuntimeLoopControllerDependencies
} from './browserShellRuntimeLoopController';
import {
  attachBrowserShellRuntimeDebugHooks,
  createBrowserShellStateController,
  createRunSeed
} from './browserShellSession';
import { stepMapScene } from './mapSceneFlow';
import { createShellEventBridge } from './shellEventBridge';
import { stepRunState } from './runStep';
import type { createInitialRuntimeState, RuntimeState } from './runtimeState';
import type { BrowserShellRuntimeOptions } from './browserShellRuntime';
import type { BrowserShellStateController } from './browserShellSession';

export interface BrowserShellRuntimeFactoryDependencies {
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

export interface BrowserShellRuntimeFactoryResult {
  readonly advanceTime: (ms: number) => void;
  readonly drawScene: () => void;
  readonly stateController: BrowserShellStateController;
}

export function createBrowserShellRuntimeFactory(
  options: BrowserShellRuntimeOptions,
  dependencies: BrowserShellRuntimeFactoryDependencies = {}
): BrowserShellRuntimeFactoryResult {
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
    advanceTime: runtimeLoop.advanceTime,
    drawScene: () => {
      drawScene(stateController.getState(), options.renderMapScene, options.renderRunScene);
    },
    stateController
  };
}

function drawScene(
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
