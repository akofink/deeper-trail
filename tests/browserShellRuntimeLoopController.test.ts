import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserShellRuntimeLoopController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserShellRuntimeApp
} from '../src/game/runtime/browserShellRuntimeLoopController';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import type { ShellRuntimeHandlers } from '../src/game/runtime/shellRuntimeLoop';

function createStubState(scene: RuntimeState['scene'] = 'run'): RuntimeState {
  return {
    scene,
    sim: {
      vehicle: {}
    }
  } as RuntimeState;
}

describe('browserShellRuntimeLoopController', () => {
  it('binds shell handlers and advances using the latest state', () => {
    const runState = createStubState('run');
    const mapState = createStubState('map');
    const app = {
      canvas: { requestFullscreen: vi.fn(async () => {}) },
      renderer: { render: vi.fn() },
      stage: { tag: 'stage' }
    } satisfies BrowserShellRuntimeApp;
    const documentHost = {
      exitFullscreen: vi.fn(async () => {}),
      fullscreenElement: null
    } as unknown as BrowserDocumentHost;
    const shellWindow = {
      addEventListener: vi.fn(),
      requestAnimationFrame: vi.fn()
    } as unknown as BrowserShellHost;
    const renderRunScene = vi.fn();
    const renderMapScene = vi.fn();
    const stepMapScene = vi.fn();
    const stepRunState = vi.fn(() => ({
      previousDashPressed: false,
      previousJumpPressed: false
    }));
    let state = runState;
    let handlers: ShellRuntimeHandlers | undefined;

    const controller = createBrowserShellRuntimeLoopController(
      {
        app,
        documentHost,
        getState: () => state,
        renderMapScene,
        renderRunScene,
        screenWidth: () => 960,
        shellEventBridge: {
          buildRunStepInputSnapshot: () => ({
            dashLeftPressed: false,
            dashRightPressed: false,
            jumpPressed: false,
            leftPressed: false,
            previousDashPressed: false,
            previousJumpPressed: false,
            rightPressed: false
          }),
          mapRotateInput: () => 1,
          onKeyDown: () => {
            state = mapState;
            return { preventDefault: false, toggleFullscreen: false };
          },
          onKeyUp: () => {},
          onResize: () => {},
          updateRunStepInputResult: () => {}
        },
        shellWindow
      },
      {
        bindShellRuntimeLoop: (_host, nextHandlers) => {
          handlers = nextHandlers;
        },
        createFrameLoopController: (_fixedDt, callbacks) => ({
          advanceTime: () => {
            handlers?.onKeyDown('KeyA');
            callbacks.currentScene() === 'run' ? callbacks.stepRun(1 / 60) : callbacks.stepMap(1 / 60);
            callbacks.currentScene() === 'run' ? callbacks.drawRun() : callbacks.drawMap();
            callbacks.renderFrame();
          },
          onAnimationFrame: () => {}
        }),
        stepMapScene,
        stepRunState
      }
    );

    expect(handlers).toBeDefined();

    controller.advanceTime(16);

    expect(stepRunState).not.toHaveBeenCalled();
    expect(stepMapScene).toHaveBeenCalledWith(mapState, 1 / 60, 1);
    expect(renderMapScene).toHaveBeenCalledWith(mapState);
    expect(renderRunScene).not.toHaveBeenCalled();
    expect(app.renderer.render).toHaveBeenCalledWith(app.stage);
  });

  it('toggles fullscreen through the bound handler', async () => {
    const app = {
      canvas: { requestFullscreen: vi.fn(async () => {}) },
      renderer: { render: vi.fn() },
      stage: {}
    } satisfies BrowserShellRuntimeApp;
    const documentHost = {
      exitFullscreen: vi.fn(async () => {}),
      fullscreenElement: null
    } as unknown as BrowserDocumentHost;
    const shellWindow = {
      addEventListener: vi.fn(),
      requestAnimationFrame: vi.fn()
    } as unknown as BrowserShellHost;
    let handlers: ShellRuntimeHandlers | undefined;

    createBrowserShellRuntimeLoopController(
      {
        app,
        documentHost,
        getState: () => createStubState('run'),
        renderMapScene: vi.fn(),
        renderRunScene: vi.fn(),
        screenWidth: () => 960,
        shellEventBridge: {
          buildRunStepInputSnapshot: vi.fn(),
          mapRotateInput: vi.fn(),
          onKeyDown: vi.fn(() => ({ preventDefault: false, toggleFullscreen: true })),
          onKeyUp: vi.fn(),
          onResize: vi.fn(),
          updateRunStepInputResult: vi.fn()
        },
        shellWindow
      },
      {
        bindShellRuntimeLoop: (_host, nextHandlers) => {
          handlers = nextHandlers;
        },
        createFrameLoopController: () => ({
          advanceTime: vi.fn(),
          onAnimationFrame: vi.fn()
        })
      }
    );

    await handlers?.onToggleFullscreen();

    expect(app.canvas.requestFullscreen).toHaveBeenCalledOnce();
    expect(documentHost.exitFullscreen).not.toHaveBeenCalled();
  });
});
