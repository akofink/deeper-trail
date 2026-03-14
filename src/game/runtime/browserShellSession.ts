import { getMaxHealth } from '../../engine/sim/vehicle';
import { buildDebugStateSnapshot } from './debugState';
import { createInitialRuntimeState, type RuntimeState } from './runtimeState';

export interface BrowserShellWindow {
  location: Pick<Location, 'search'>;
  render_game_to_text?: () => string;
  advanceTime?: (ms: number) => void;
}

export interface BrowserCryptoHost {
  randomUUID?: () => string;
}

export interface BrowserShellStateController {
  readonly getState: () => RuntimeState;
  readonly setState: (nextState: RuntimeState) => void;
}

export interface BrowserShellStateControllerDependencies {
  readonly createInitialRuntimeState?: typeof createInitialRuntimeState;
  readonly createSeed?: typeof createRunSeed;
}

export interface BrowserShellDebugHookDependencies {
  readonly attachDebugWindowHooks?: typeof attachDebugWindowHooks;
  readonly buildDebugStateSnapshot?: typeof buildDebugStateSnapshot;
  readonly getMaxHealth?: typeof getMaxHealth;
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

export function createBrowserShellStateController(
  screenHeight: number,
  shellWindow: BrowserShellWindow,
  dependencies: BrowserShellStateControllerDependencies = {}
): BrowserShellStateController {
  const createInitialState = dependencies.createInitialRuntimeState ?? createInitialRuntimeState;
  const createSeed = dependencies.createSeed ?? createRunSeed;

  let state = createInitialState(screenHeight, initialSeedFromWindow(shellWindow) ?? createSeed());

  return {
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    }
  };
}

export function attachBrowserShellRuntimeDebugHooks(
  shellWindow: BrowserShellWindow,
  stateController: Pick<BrowserShellStateController, 'getState'>,
  screenWidth: () => number,
  advanceTime: (ms: number) => void,
  dependencies: BrowserShellDebugHookDependencies = {}
): void {
  const attachHooks = dependencies.attachDebugWindowHooks ?? attachDebugWindowHooks;
  const buildSnapshot = dependencies.buildDebugStateSnapshot ?? buildDebugStateSnapshot;
  const resolveMaxHealth = dependencies.getMaxHealth ?? getMaxHealth;

  attachHooks(shellWindow, {
    renderGameToText: () => {
      const state = stateController.getState();
      return JSON.stringify(buildSnapshot(state, screenWidth(), resolveMaxHealth(state.sim.vehicle)));
    },
    advanceTime
  });
}
