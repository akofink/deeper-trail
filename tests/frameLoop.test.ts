import { describe, expect, it } from 'vitest';

import { createFrameLoopController, type RuntimeScene } from '../src/game/runtime/frameLoop';

describe('frameLoop controller', () => {
  it('steps and draws the active run scene using clamped animation-frame delta', () => {
    const runDts: number[] = [];
    let renderCalls = 0;

    const controller = createFrameLoopController(1 / 60, {
      currentScene: () => 'run',
      drawMap: () => {
        throw new Error('Expected run scene draw');
      },
      drawRun: () => undefined,
      renderFrame: () => {
        renderCalls += 1;
      },
      stepMap: () => {
        throw new Error('Expected run scene step');
      },
      stepRun: (dt) => {
        runDts.push(dt);
      }
    });

    controller.onAnimationFrame(1000);
    controller.onAnimationFrame(1100);

    expect(runDts[0]).toBe(0);
    expect(runDts[1]).toBe(0.05);
    expect(renderCalls).toBe(2);
  });

  it('routes map scene stepping and drawing when the active scene is map', () => {
    const mapDts: number[] = [];
    let drawMapCalls = 0;

    const controller = createFrameLoopController(1 / 60, {
      currentScene: () => 'map',
      drawMap: () => {
        drawMapCalls += 1;
      },
      drawRun: () => {
        throw new Error('Expected map scene draw');
      },
      renderFrame: () => undefined,
      stepMap: (dt) => {
        mapDts.push(dt);
      },
      stepRun: () => {
        throw new Error('Expected map scene step');
      }
    });

    controller.onAnimationFrame(500);
    controller.onAnimationFrame(516);

    expect(mapDts).toEqual([0, 0.016]);
    expect(drawMapCalls).toBe(2);
  });

  it('advanceTime uses fixed-step stepping and renders once after stepping', () => {
    const steppedScenes: RuntimeScene[] = [];
    const steppedDts: number[] = [];
    let scene: RuntimeScene = 'run';
    let drawRunCalls = 0;
    let drawMapCalls = 0;
    let renderCalls = 0;

    const controller = createFrameLoopController(1 / 60, {
      currentScene: () => scene,
      drawMap: () => {
        drawMapCalls += 1;
      },
      drawRun: () => {
        drawRunCalls += 1;
      },
      renderFrame: () => {
        renderCalls += 1;
      },
      stepMap: (dt) => {
        steppedScenes.push('map');
        steppedDts.push(dt);
      },
      stepRun: (dt) => {
        steppedScenes.push('run');
        steppedDts.push(dt);
      }
    });

    controller.advanceTime(100);

    expect(steppedScenes).toEqual(['run', 'run', 'run', 'run', 'run', 'run']);
    expect(steppedDts.every((dt) => dt === 1 / 60)).toBe(true);
    expect(drawRunCalls).toBe(1);
    expect(renderCalls).toBe(1);

    scene = 'map';
    controller.advanceTime(1);

    expect(steppedScenes[6]).toBe('map');
    expect(drawMapCalls).toBe(1);
  });
});
