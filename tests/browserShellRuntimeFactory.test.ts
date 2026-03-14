import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserShellRuntimeFactory
} from '../src/game/runtime/browserShellRuntimeFactory';
import type {
  BrowserDocumentHost,
  BrowserShellHost,
  BrowserShellRuntimeApp
} from '../src/game/runtime/browserShellRuntime';
import type { DebugStateSnapshot } from '../src/game/runtime/debugState';
import type { RuntimeState } from '../src/game/runtime/runtimeState';

function createStubState(scene: RuntimeState['scene'] = 'run'): RuntimeState {
  return {
    scene,
    sim: {
      vehicle: {}
    }
  } as RuntimeState;
}

describe('browserShellRuntimeFactory', () => {
  it('assembles state, event, loop, and debug dependencies around a shared state controller', () => {
    const shellWindow = {
      addEventListener: vi.fn(),
      location: { search: '?seed=route-77' },
      requestAnimationFrame: vi.fn()
    } as unknown as BrowserShellHost;
    const documentHost = {
      exitFullscreen: vi.fn(async () => {}),
      fullscreenElement: null,
      querySelector: vi.fn()
    } as unknown as BrowserDocumentHost;
    const app = {
      canvas: { requestFullscreen: vi.fn(async () => {}) },
      renderer: { render: vi.fn() },
      screen: { height: 480 },
      stage: { tag: 'stage' }
    } satisfies BrowserShellRuntimeApp;
    const state = createStubState();
    const renderRunScene = vi.fn();
    const renderMapScene = vi.fn();
    const attachBrowserShellRuntimeDebugHooks = vi.fn();
    const createBrowserShellRuntimeLoopController = vi.fn(() => ({
      advanceTime: vi.fn()
    }));
    const createBrowserShellStateController = vi.fn(() => ({
      getState: () => state,
      setState: vi.fn()
    }));

    const runtime = createBrowserShellRuntimeFactory(
      {
        app,
        documentHost,
        renderMapScene,
        renderRunScene,
        screenHeight: () => 480,
        screenWidth: () => 960,
        shellWindow
      },
      {
        attachBrowserShellRuntimeDebugHooks,
        createBrowserShellRuntimeLoopController,
        createBrowserShellStateController
      }
    );

    expect(createBrowserShellStateController).toHaveBeenCalledWith(480, shellWindow, {
      createInitialRuntimeState: undefined,
      createSeed: expect.any(Function)
    });
    expect(createBrowserShellRuntimeLoopController).toHaveBeenCalledOnce();
    expect(attachBrowserShellRuntimeDebugHooks).toHaveBeenCalledWith(
      shellWindow,
      expect.objectContaining({ getState: expect.any(Function) }),
      expect.any(Function),
      expect.any(Function),
      { getMaxHealth: undefined }
    );

    runtime.drawScene();

    expect(renderRunScene).toHaveBeenCalledWith(state);
    expect(renderMapScene).not.toHaveBeenCalled();
    expect(runtime.stateController.getState()).toBe(state);
  });

  it('keeps debug snapshots and loop reads aligned with the latest replaced state', () => {
    const shellWindow = {
      addEventListener: vi.fn(),
      location: { search: '' },
      requestAnimationFrame: vi.fn()
    } as unknown as BrowserShellHost;
    const documentHost = {
      exitFullscreen: vi.fn(async () => {}),
      fullscreenElement: null,
      querySelector: vi.fn()
    } as unknown as BrowserDocumentHost;
    const app = {
      canvas: { requestFullscreen: vi.fn(async () => {}) },
      renderer: { render: vi.fn() },
      screen: { height: 480 },
      stage: {}
    } satisfies BrowserShellRuntimeApp;
    const runState = createStubState('run');
    const mapState = createStubState('map');
    const renderRunScene = vi.fn();
    const renderMapScene = vi.fn();
    let currentState = runState;
    const createEventBridge = vi.fn(({ setState }) => ({
      buildRunStepInputSnapshot: () => ({
        dashLeftPressed: false,
        dashRightPressed: false,
        jumpPressed: false,
        leftPressed: false,
        previousDashPressed: false,
        previousJumpPressed: false,
        rightPressed: false
      }),
      mapRotateInput: () => 0,
      onBlur: () => {},
      onKeyDown: () => {
        setState(mapState);
        return { preventDefault: false, toggleFullscreen: false };
      },
      onKeyUp: () => {},
      onResize: () => {},
      updateRunStepInputResult: () => {}
    }));

    const runtime = createBrowserShellRuntimeFactory(
      {
        app,
        documentHost,
        renderMapScene,
        renderRunScene,
        screenHeight: () => 480,
        screenWidth: () => 960,
        shellWindow
      },
      {
        attachBrowserShellRuntimeDebugHooks: (windowHost, stateController, screenWidth, advanceTime) => {
          windowHost.advanceTime = advanceTime;
          windowHost.render_game_to_text = () =>
            JSON.stringify({
              scene: stateController.getState().scene,
              screenWidth: screenWidth()
            } as unknown as DebugStateSnapshot);
        },
        createBrowserShellRuntimeLoopController: ({ getState, renderMapScene: drawMapScene, shellEventBridge }) => ({
          advanceTime: () => {
            shellEventBridge.onKeyDown('KeyA');
            drawMapScene(getState());
          }
        }),
        createEventBridge,
        createBrowserShellStateController: () => ({
          getState: () => currentState,
          setState: (nextState) => {
            currentState = nextState;
          }
        }),
        createInitialRuntimeState: vi.fn(() => runState)
      }
    );

    runtime.advanceTime(16);
    runtime.drawScene();

    expect(renderMapScene).toHaveBeenCalledWith(mapState);
    expect(renderRunScene).not.toHaveBeenCalled();
    expect(shellWindow.render_game_to_text?.()).toContain('"scene":"map"');
  });
});
