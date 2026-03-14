import { describe, expect, it, vi } from 'vitest';

import {
  attachBrowserShellRuntimeDebugHooks,
  attachDebugWindowHooks,
  createBrowserShellStateController,
  createRunSeed,
  initialSeedFromSearch,
  initialSeedFromWindow,
  type BrowserShellWindow
} from '../src/game/runtime/browserShellSession';
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

describe('browserShellSession helpers', () => {
  it('prefers crypto UUID seeds when available', () => {
    expect(
      createRunSeed({
        randomUUID: () => '12345678-9abc-def0-1234-56789abcdef0'
      })
    ).toBe('12345678');
  });

  it('falls back to time and random when crypto UUID is unavailable', () => {
    expect(createRunSeed(null, () => 46655, () => 0.5)).toBe('zzz-i000');
  });

  it('reads and trims the seed query parameter', () => {
    expect(initialSeedFromSearch('?seed=%20expedition-42%20')).toBe('expedition-42');
    expect(initialSeedFromSearch('?other=value')).toBeUndefined();
    expect(initialSeedFromSearch('?seed=%20%20')).toBeUndefined();
  });

  it('reads the initial seed from a browser-style window object', () => {
    expect(initialSeedFromWindow({ location: { search: '?seed=route-a' } })).toBe('route-a');
  });

  it('attaches deterministic debug hooks to the browser window', () => {
    const shellWindow: BrowserShellWindow = { location: { search: '' } };
    const advanceTime = vi.fn<(ms: number) => void>();

    attachDebugWindowHooks(shellWindow, {
      renderGameToText: () => 'snapshot',
      advanceTime
    });

    expect(shellWindow.render_game_to_text?.()).toBe('snapshot');

    shellWindow.advanceTime?.(250);
    expect(advanceTime).toHaveBeenCalledWith(250);
  });

  it('creates initial runtime state from the URL seed and keeps replacement state readable', () => {
    const runState = createStubState('run');
    const mapState = createStubState('map');
    const createInitialRuntimeState = vi.fn(() => runState);
    const controller = createBrowserShellStateController(480, { location: { search: '?seed=route-77' } }, {
      createInitialRuntimeState,
      createSeed: () => 'generated-seed'
    });

    expect(createInitialRuntimeState).toHaveBeenCalledWith(480, 'route-77');
    expect(controller.getState()).toBe(runState);

    controller.setState(mapState);
    expect(controller.getState()).toBe(mapState);
  });

  it('builds debug hooks from the latest runtime state on demand', () => {
    const runState = createStubState('run');
    const mapState = createStubState('map');
    const shellWindow: BrowserShellWindow = { location: { search: '' } };
    const controller = {
      getState: vi.fn(() => mapState)
    };
    const attachDebugWindowHooks = vi.fn((windowHost: BrowserShellWindow, hooks: { renderGameToText: () => string; advanceTime: (ms: number) => void }) => {
      windowHost.render_game_to_text = hooks.renderGameToText;
      windowHost.advanceTime = hooks.advanceTime;
    });
    const buildDebugStateSnapshot = vi.fn(
      (state: RuntimeState, screenWidth: number, maxHealth: number) =>
        ({
          maxHealth,
          scene: state.scene,
          screenWidth
        }) as unknown as DebugStateSnapshot
    );
    const advanceTime = vi.fn<(ms: number) => void>();

    attachBrowserShellRuntimeDebugHooks(shellWindow, controller, () => 960, advanceTime, {
      attachDebugWindowHooks,
      buildDebugStateSnapshot,
      getMaxHealth: () => 7
    });

    expect(attachDebugWindowHooks).toHaveBeenCalledOnce();
    expect(shellWindow.render_game_to_text?.()).toContain('"scene":"map"');
    expect(shellWindow.render_game_to_text?.()).toContain('"screenWidth":960');
    expect(buildDebugStateSnapshot).toHaveBeenCalledWith(mapState, 960, 7);

    shellWindow.advanceTime?.(16);
    expect(advanceTime).toHaveBeenCalledWith(16);

    controller.getState.mockReturnValue(runState);
    expect(shellWindow.render_game_to_text?.()).toContain('"scene":"run"');
  });
});
