import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserShellRuntimeController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserShellRuntimeApp
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

describe('browserShellRuntime controller', () => {
  it('seeds state from the URL, delegates loop ownership, and exposes debug hooks', () => {
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
    const attachDebugWindowHooks = vi.fn();
    const createBrowserShellRuntimeLoopController = vi.fn(() => ({
      advanceTime: vi.fn()
    }));
    const createInitialRuntimeState = vi.fn(() => state);
    const buildDebugStateSnapshot = vi.fn(
      (nextState: RuntimeState) =>
        ({
          scene: nextState.scene
        }) as DebugStateSnapshot
    );

    const runtime = createBrowserShellRuntimeController(
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
        attachDebugWindowHooks,
        buildDebugStateSnapshot,
        createBrowserShellRuntimeLoopController,
        createInitialRuntimeState
      }
    );

    expect(createInitialRuntimeState).toHaveBeenCalledWith(480, 'route-77');
    expect(createBrowserShellRuntimeLoopController).toHaveBeenCalledOnce();
    expect(attachDebugWindowHooks).toHaveBeenCalledOnce();

    const hookOptions = attachDebugWindowHooks.mock.calls[0]?.[1] as {
      advanceTime: (ms: number) => void;
      renderGameToText: () => string;
    };
    expect(hookOptions.renderGameToText()).toContain('"scene":"run"');

    runtime.drawInitialScene();

    expect(renderRunScene).toHaveBeenCalledWith(state);
    expect(renderMapScene).not.toHaveBeenCalled();
    expect(app.renderer.render).toHaveBeenCalledWith(app.stage);
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

    createBrowserShellRuntimeController(
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
        attachDebugWindowHooks: (windowHost, hooks) => {
          windowHost.advanceTime = hooks.advanceTime;
          windowHost.render_game_to_text = hooks.renderGameToText;
        },
        buildDebugStateSnapshot: ((nextState: RuntimeState) =>
          ({
            scene: nextState.scene
          }) as DebugStateSnapshot),
        createBrowserShellRuntimeLoopController: ({ getState, renderMapScene: drawMapScene, shellEventBridge }) => ({
          advanceTime: () => {
            shellEventBridge.onKeyDown('KeyA');
            drawMapScene(getState());
            app.renderer.render(app.stage);
          }
        }),
        createEventBridge,
        createInitialRuntimeState: vi.fn(() => runState)
      }
    );

    shellWindow.advanceTime?.(16);

    expect(renderMapScene).toHaveBeenCalledWith(mapState);
    expect(renderRunScene).not.toHaveBeenCalled();
    expect(shellWindow.render_game_to_text?.()).toContain('"scene":"map"');
  });
});
