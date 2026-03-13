export type RuntimeScene = 'run' | 'map';

export interface FrameLoopCallbacks {
  readonly currentScene: () => RuntimeScene;
  readonly stepRun: (dt: number) => void;
  readonly stepMap: (dt: number) => void;
  readonly drawRun: () => void;
  readonly drawMap: () => void;
  readonly renderFrame: () => void;
}

export interface FrameLoopController {
  readonly onAnimationFrame: (now: number) => void;
  readonly advanceTime: (ms: number) => void;
}

const MAX_DT_SECONDS = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stepScene(callbacks: FrameLoopCallbacks, dt: number): void {
  if (callbacks.currentScene() === 'run') {
    callbacks.stepRun(dt);
    return;
  }
  callbacks.stepMap(dt);
}

function drawScene(callbacks: FrameLoopCallbacks): void {
  if (callbacks.currentScene() === 'run') {
    callbacks.drawRun();
    return;
  }
  callbacks.drawMap();
}

export function createFrameLoopController(fixedDtSeconds: number, callbacks: FrameLoopCallbacks): FrameLoopController {
  let previousTime: number | undefined;
  let externalStepping = false;

  return {
    onAnimationFrame(now: number): void {
      const prev = previousTime ?? now;
      previousTime = now;

      if (externalStepping) {
        return;
      }

      const dt = clamp((now - prev) / 1000, 0, MAX_DT_SECONDS);
      stepScene(callbacks, dt);
      drawScene(callbacks);
      callbacks.renderFrame();
    },

    advanceTime(ms: number): void {
      externalStepping = true;
      try {
        const steps = Math.max(1, Math.round(ms / (fixedDtSeconds * 1000)));
        for (let i = 0; i < steps; i += 1) {
          stepScene(callbacks, fixedDtSeconds);
        }
        drawScene(callbacks);
        callbacks.renderFrame();
      } finally {
        externalStepping = false;
      }
    }
  };
}
