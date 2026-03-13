import { describe, expect, it, vi } from 'vitest';
import { buildRunSceneRenderPlan } from '../src/game/runtime/runSceneRenderPlan';
import type { SceneTextView } from '../src/game/runtime/sceneTextView';
import { createInitialRuntimeState } from '../src/game/runtime/runtimeState';

function measureText(view: SceneTextView): { width: number; height: number } {
  const longestLine = Math.max(...view.text.split('\n').map((line) => line.length), 0);
  const lineCount = Math.max(1, view.text.split('\n').length);

  return {
    width: Math.max(10, longestLine * 7),
    height: lineCount * 14
  };
}

describe('runSceneRenderPlan', () => {
  it('assembles run-scene hud/chip/text state for an active run', () => {
    const state = createInitialRuntimeState(720, 'run-scene-render-plan-active');
    state.mode = 'playing';
    state.scene = 'run';
    state.beacons = [
      { id: 'b0', x: 180, y: 180, r: 16, activated: false },
      { id: 'b1', x: 360, y: 180, r: 16, activated: false }
    ];

    const measured = vi.fn(measureText);
    const plan = buildRunSceneRenderPlan({
      cameraX: 24,
      measureText: measured,
      moduleLabelCount: 6,
      screenHeight: 720,
      screenWidth: 960,
      state
    });

    expect(plan.nodeType).toBe('town');
    expect(plan.exitReady).toBe(false);
    expect(plan.overlayCard).toBeNull();
    expect(plan.chips).toHaveLength(5);
    expect(plan.hudView.moduleLabels).toHaveLength(6);
    expect(plan.textAssembly.beaconLabels).toHaveLength(2);
    expect(plan.textAssembly.chipLabels).toHaveLength(plan.chips.length);
    expect(measured).toHaveBeenCalled();
  });

  it('marks exit ready once objectives are complete and preserves mode overlays', () => {
    const state = createInitialRuntimeState(720, 'run-scene-render-plan-complete');
    state.mode = 'paused';
    state.scene = 'run';
    state.beacons = [{ id: 'b0', x: 200, y: 180, r: 16, activated: true }];
    state.serviceStops = [];
    state.syncGates = [];
    state.canopyLifts = [];
    state.impactPlates = [];

    const plan = buildRunSceneRenderPlan({
      cameraX: 0,
      measureText,
      moduleLabelCount: 6,
      screenHeight: 720,
      screenWidth: 960,
      state
    });

    expect(plan.exitReady).toBe(true);
    expect(plan.overlayCard?.text).toContain('Paused');
    expect(plan.textAssembly.beaconLabels).toHaveLength(0);
  });
});
