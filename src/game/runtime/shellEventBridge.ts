import { handleShellKeyDown, handleShellKeyUp, resizeRuntimeState } from './shellControl';
import type { ShellKeyDispatchResult } from './shellRuntimeLoop';
import type { RuntimeState } from './runtimeState';

export interface RunStepInputSnapshot {
  leftPressed: boolean;
  rightPressed: boolean;
  jumpPressed: boolean;
  dashLeftPressed: boolean;
  dashRightPressed: boolean;
  previousJumpPressed: boolean;
  previousDashPressed: boolean;
}

export interface RunStepInputResult {
  previousJumpPressed: boolean;
  previousDashPressed: boolean;
}

export interface ShellEventBridgeOptions {
  createSeed: () => string;
  getCanvasHeight: () => number;
  getState: () => RuntimeState;
  setState: (state: RuntimeState) => void;
}

export interface ShellEventBridge {
  buildRunStepInputSnapshot: () => RunStepInputSnapshot;
  mapRotateInput: () => -1 | 0 | 1;
  onKeyDown: (code: string) => ShellKeyDispatchResult;
  onKeyUp: (code: string) => void;
  onResize: () => void;
  updateRunStepInputResult: (result: RunStepInputResult) => void;
}

export function createShellEventBridge(options: ShellEventBridgeOptions): ShellEventBridge {
  const pressedKeys = new Set<string>();
  let previousJumpPressed = false;
  let previousDashPressed = false;
  let previousMapNavigate = false;

  const mapRotateInput = (): -1 | 0 | 1 => {
    const rotateInput = (pressedKeys.has('KeyE') ? 1 : 0) - (pressedKeys.has('KeyQ') ? 1 : 0);
    if (rotateInput > 0) {
      return 1;
    }
    if (rotateInput < 0) {
      return -1;
    }
    return 0;
  };

  const onKeyDown = (code: string): ShellKeyDispatchResult => {
    pressedKeys.add(code);

    const result = handleShellKeyDown(options.getState(), code, {
      canvasHeight: options.getCanvasHeight(),
      createSeed: options.createSeed,
      previousMapNavigate
    });

    options.setState(result.nextState);
    previousMapNavigate = result.previousMapNavigate;

    return {
      preventDefault: result.preventDefault,
      toggleFullscreen: result.toggleFullscreen
    };
  };

  const onKeyUp = (code: string): void => {
    pressedKeys.delete(code);
    previousMapNavigate = handleShellKeyUp(code, previousMapNavigate, {
      hasHeldMapNavigationKey: pressedKeys.has('ArrowUp') || pressedKeys.has('ArrowDown')
    }).previousMapNavigate;
  };

  const onResize = (): void => {
    resizeRuntimeState(options.getState(), options.getCanvasHeight());
  };

  return {
    buildRunStepInputSnapshot: () => ({
      leftPressed: pressedKeys.has('ArrowLeft'),
      rightPressed: pressedKeys.has('ArrowRight'),
      jumpPressed: pressedKeys.has('Space'),
      dashLeftPressed: pressedKeys.has('ShiftLeft'),
      dashRightPressed: pressedKeys.has('ShiftRight'),
      previousJumpPressed,
      previousDashPressed
    }),
    mapRotateInput,
    onKeyDown,
    onKeyUp,
    onResize,
    updateRunStepInputResult: (result: RunStepInputResult) => {
      previousJumpPressed = result.previousJumpPressed;
      previousDashPressed = result.previousDashPressed;
    }
  };
}
