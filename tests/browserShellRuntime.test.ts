import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserShellRuntimeController,
  type BrowserDocumentHost,
  type BrowserShellHost,
  type BrowserShellRuntimeDependencies,
  type BrowserShellRuntimeApp
} from '../src/game/runtime/browserShellRuntime';
import type { DebugStateSnapshot } from '../src/game/runtime/debugState';
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

describe('browserShellRuntime controller', () => {
  it('binds the shell loop, seeds state from the URL, and exposes debug hooks', () => {
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
    const bindShellRuntimeLoop: NonNullable<BrowserShellRuntimeDependencies['bindShellRuntimeLoop']> = vi.fn();
    const attachDebugWindowHooks = vi.fn();
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
        bindShellRuntimeLoop,
        buildDebugStateSnapshot,
        createInitialRuntimeState
      }
    );

    expect(createInitialRuntimeState).toHaveBeenCalledWith(480, 'route-77');
    expect(bindShellRuntimeLoop).toHaveBeenCalledOnce();
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

  it('steps and draws against the latest state after key handlers replace it', () => {
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
    const stepRunState = vi.fn(() => ({
      previousDashPressed: false,
      previousJumpPressed: false
    }));
    let handlers: ShellRuntimeHandlers | undefined;

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
        bindShellRuntimeLoop: (_host, nextHandlers) => {
          handlers = nextHandlers;
        },
        buildDebugStateSnapshot: ((nextState: RuntimeState) =>
          ({
            scene: nextState.scene
          }) as DebugStateSnapshot) as BrowserShellRuntimeDependencies['buildDebugStateSnapshot'],
        createEventBridge: ({ setState }) => ({
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
          onKeyDown: () => {
            setState(mapState);
            return { preventDefault: false, toggleFullscreen: false };
          },
          onKeyUp: () => {},
          onResize: () => {},
          updateRunStepInputResult: () => {}
        }),
        createFrameLoopController: (_fixedDt, callbacks) => ({
          advanceTime: () => {
            callbacks.currentScene() === 'run' ? callbacks.stepRun(1 / 60) : callbacks.stepMap(1 / 60);
            callbacks.currentScene() === 'run' ? callbacks.drawRun() : callbacks.drawMap();
            callbacks.renderFrame();
          },
          onAnimationFrame: () => {}
        }),
        createInitialRuntimeState: vi.fn(() => runState),
        stepMapScene: vi.fn(),
        stepRunState
      }
    );

    handlers?.onKeyDown('KeyA');
    shellWindow.advanceTime?.(16);

    expect(stepRunState).not.toHaveBeenCalled();
    expect(renderMapScene).toHaveBeenCalledWith(mapState);
    expect(renderRunScene).not.toHaveBeenCalled();
    expect(shellWindow.render_game_to_text?.()).toContain('"scene":"map"');
  });
});
