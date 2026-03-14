export interface ShellKeyDispatchResult {
  preventDefault: boolean;
  toggleFullscreen: boolean;
}

export interface ShellRuntimeHandlers {
  onAnimationFrame: (now: number) => void;
  onBlur: () => void;
  onKeyDown: (code: string) => ShellKeyDispatchResult;
  onKeyUp: (code: string) => void;
  onResize: () => void;
  onToggleFullscreen: () => void | Promise<void>;
}

export interface ShellKeyboardEvent {
  code: string;
  preventDefault: () => void;
}

export interface ShellRuntimeHost {
  addEventListener: (type: 'blur' | 'keydown' | 'keyup' | 'resize', listener: (event: unknown) => void) => void;
  requestAnimationFrame: (callback: (now: number) => void) => void;
}

function isKeyboardEvent(event: unknown): event is ShellKeyboardEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'code' in event &&
    typeof (event as { code?: unknown }).code === 'string' &&
    'preventDefault' in event &&
    typeof (event as { preventDefault?: unknown }).preventDefault === 'function'
  );
}

export function bindShellRuntimeLoop(host: ShellRuntimeHost, handlers: ShellRuntimeHandlers): void {
  host.addEventListener('keydown', (event) => {
    if (!isKeyboardEvent(event)) {
      return;
    }

    const result = handlers.onKeyDown(event.code);
    if (result.toggleFullscreen) {
      void handlers.onToggleFullscreen();
    }
    if (result.preventDefault) {
      event.preventDefault();
    }
  });

  host.addEventListener('keyup', (event) => {
    if (!isKeyboardEvent(event)) {
      return;
    }

    handlers.onKeyUp(event.code);
  });

  host.addEventListener('resize', () => {
    handlers.onResize();
  });

  host.addEventListener('blur', () => {
    handlers.onBlur();
  });

  const gameLoop = (now: number): void => {
    handlers.onAnimationFrame(now);
    host.requestAnimationFrame(gameLoop);
  };

  host.requestAnimationFrame(gameLoop);
}
