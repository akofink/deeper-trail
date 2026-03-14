import { describe, expect, it } from 'vitest';

import { bindShellRuntimeLoop } from '../src/game/runtime/shellRuntimeLoop';

type Listener = (event: unknown) => void;

interface MockHost {
  blur: Listener[];
  keydown: Listener[];
  keyup: Listener[];
  resize: Listener[];
  animationFrames: Array<(now: number) => void>;
}

function createMockHost(): MockHost {
  return {
    blur: [],
    keydown: [],
    keyup: [],
    resize: [],
    animationFrames: []
  };
}

describe('shellRuntimeLoop bindings', () => {
  it('routes keydown/keyup/resize events and applies keydown effects', () => {
    const host = createMockHost();
    const keyDownCodes: string[] = [];
    const keyUpCodes: string[] = [];
    const blurCalls: number[] = [];
    const resizeCalls: number[] = [];
    const fullscreenCalls: number[] = [];

    bindShellRuntimeLoop(
      {
        addEventListener: (type, listener) => {
          host[type].push(listener);
        },
        requestAnimationFrame: (callback) => {
          host.animationFrames.push(callback);
        }
      },
      {
        onAnimationFrame: () => undefined,
        onBlur: () => {
          blurCalls.push(1);
        },
        onKeyDown: (code) => {
          keyDownCodes.push(code);
          return {
            preventDefault: code === 'Enter',
            toggleFullscreen: code === 'KeyF'
          };
        },
        onKeyUp: (code) => {
          keyUpCodes.push(code);
        },
        onResize: () => {
          resizeCalls.push(1);
        },
        onToggleFullscreen: () => {
          fullscreenCalls.push(1);
        }
      }
    );

    expect(host.blur.length).toBe(1);
    expect(host.keydown.length).toBe(1);
    expect(host.keyup.length).toBe(1);
    expect(host.resize.length).toBe(1);

    let preventDefaultCalls = 0;
    host.keydown[0]?.({
      code: 'Enter',
      preventDefault: () => {
        preventDefaultCalls += 1;
      }
    });
    host.keydown[0]?.({
      code: 'KeyF',
      preventDefault: () => {
        throw new Error('Should not prevent default for fullscreen test key.');
      }
    });

    host.keyup[0]?.({
      code: 'ArrowUp',
      preventDefault: () => undefined
    });
    host.blur[0]?.({});
    host.resize[0]?.({});

    expect(keyDownCodes).toEqual(['Enter', 'KeyF']);
    expect(keyUpCodes).toEqual(['ArrowUp']);
    expect(blurCalls).toEqual([1]);
    expect(preventDefaultCalls).toBe(1);
    expect(fullscreenCalls).toEqual([1]);
    expect(resizeCalls).toEqual([1]);
  });

  it('starts and self-schedules the animation frame loop', () => {
    const host = createMockHost();
    const frameTimes: number[] = [];

    bindShellRuntimeLoop(
      {
        addEventListener: (type, listener) => {
          host[type].push(listener);
        },
        requestAnimationFrame: (callback) => {
          host.animationFrames.push(callback);
        }
      },
      {
        onAnimationFrame: (now) => {
          frameTimes.push(now);
        },
        onBlur: () => undefined,
        onKeyDown: () => ({ preventDefault: false, toggleFullscreen: false }),
        onKeyUp: () => undefined,
        onResize: () => undefined,
        onToggleFullscreen: () => undefined
      }
    );

    expect(host.animationFrames.length).toBe(1);

    const initialFrame = host.animationFrames[0];
    expect(initialFrame).toBeDefined();
    if (!initialFrame) {
      throw new Error('Expected initial frame callback');
    }

    initialFrame(100);

    expect(frameTimes).toEqual([100]);
    expect(host.animationFrames.length).toBe(2);
  });
});
