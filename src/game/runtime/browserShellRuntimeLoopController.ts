import { createFrameLoopController } from './frameLoop';
import { stepMapScene } from './mapSceneFlow';
import { bindShellRuntimeLoop } from './shellRuntimeLoop';
import { type ShellEventBridge } from './shellEventBridge';
import { stepRunState } from './runStep';
import { type RuntimeState } from './runtimeState';

const FIXED_DT = 1 / 60;

export interface BrowserDocumentHost {
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
  readonly stage: unknown;
}

export interface BrowserShellHost {
  addEventListener: Window['addEventListener'];
  requestAnimationFrame: Window['requestAnimationFrame'];
}

export interface BrowserShellRuntimeLoopControllerOptions {
  readonly app: BrowserShellRuntimeApp;
  readonly documentHost: BrowserDocumentHost;
  readonly getState: () => RuntimeState;
  readonly renderMapScene: (state: RuntimeState) => void;
  readonly renderRunScene: (state: RuntimeState) => void;
  readonly screenWidth: () => number;
  readonly shellEventBridge: ShellEventBridge;
  readonly shellWindow: BrowserShellHost;
}

export interface BrowserShellRuntimeLoopControllerDependencies {
  readonly bindShellRuntimeLoop?: typeof bindShellRuntimeLoop;
  readonly createFrameLoopController?: typeof createFrameLoopController;
  readonly stepMapScene?: typeof stepMapScene;
  readonly stepRunState?: typeof stepRunState;
}

export interface BrowserShellRuntimeLoopController {
  readonly advanceTime: (ms: number) => void;
}

export function createBrowserShellRuntimeLoopController(
  options: BrowserShellRuntimeLoopControllerOptions,
  dependencies: BrowserShellRuntimeLoopControllerDependencies = {}
): BrowserShellRuntimeLoopController {
  const createFrameLoop = dependencies.createFrameLoopController ?? createFrameLoopController;
  const bindRuntimeLoop = dependencies.bindShellRuntimeLoop ?? bindShellRuntimeLoop;
  const mapStep = dependencies.stepMapScene ?? stepMapScene;
  const runStep = dependencies.stepRunState ?? stepRunState;

  const frameLoop = createFrameLoop(FIXED_DT, {
    currentScene: () => options.getState().scene,
    drawMap: () => drawScene(options.getState(), options.renderMapScene),
    drawRun: () => drawScene(options.getState(), options.renderRunScene),
    renderFrame: () => {
      options.app.renderer.render(options.app.stage);
    },
    stepMap: (dt) => {
      mapStep(options.getState(), dt, options.shellEventBridge.mapRotateInput());
    },
    stepRun: buildRunStep(options.getState, options.screenWidth, options.shellEventBridge, runStep)
  });

  bindRuntimeLoop(options.shellWindow, {
    onAnimationFrame: frameLoop.onAnimationFrame,
    onBlur: options.shellEventBridge.onBlur,
    onKeyDown: options.shellEventBridge.onKeyDown,
    onKeyUp: options.shellEventBridge.onKeyUp,
    onResize: options.shellEventBridge.onResize,
    onToggleFullscreen: async () => {
      await toggleFullscreen(options.app, options.documentHost);
    }
  });

  return {
    advanceTime: frameLoop.advanceTime
  };
}

function buildRunStep(
  getState: () => RuntimeState,
  screenWidth: () => number,
  shellEventBridge: ShellEventBridge,
  runStep: typeof stepRunState
): (dt: number) => void {
  return (dt: number): void => {
    const state = getState();
    const input = shellEventBridge.buildRunStepInputSnapshot();
    const result = runStep(state, { dt, screenWidth: screenWidth(), ...input });
    shellEventBridge.updateRunStepInputResult(result);
  };
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
