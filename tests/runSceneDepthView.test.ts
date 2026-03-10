import { describe, expect, it } from 'vitest';
import { buildRunSceneDepthView } from '../src/game/runtime/runSceneDepthView';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-scene-depth');

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 12,
    mapMessage: '',
    mapMessageTimer: 0,
    runPromptText: '',
    runPromptTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 1,
    dashBoost: 0.2,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: 0,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    shieldChargeAvailable: false,
    beacons: [],
    serviceStops: [],
    syncGates: [],
    canopyLifts: [],
    impactPlates: [],
    player: {
      x: 0,
      y: 0,
      vx: 130,
      vy: 0,
      w: 34,
      h: 44,
      onGround: true,
      invuln: 0,
      coyoteTime: 0,
      jumpBufferTime: 0,
      facing: 1
    },
    cameraX: 420,
    goalX: 900,
    groundY: 520,
    collectibles: [],
    hazards: [],
    sim
  };
}

describe('runSceneDepthView', () => {
  it('builds deterministic layered props for a visible run segment', () => {
    const state = buildRuntimeState();

    const first = buildRunSceneDepthView(state, 'nature', 960, 640);
    const second = buildRunSceneDepthView(state, 'nature', 960, 640);

    expect(second).toEqual(first);
    expect(first.bands).toHaveLength(3);
    expect(first.props.length).toBeGreaterThan(10);
    expect(new Set(first.props.map((prop) => prop.shape))).toEqual(new Set(['blob', 'pillar']));
  });

  it('changes palette and silhouette vocabulary by biome', () => {
    const state = buildRuntimeState();

    const anomaly = buildRunSceneDepthView(state, 'anomaly', 960, 640);
    const ruin = buildRunSceneDepthView(state, 'ruin', 960, 640);

    expect(anomaly.props.some((prop) => prop.shape === 'arch')).toBe(true);
    expect(ruin.props.some((prop) => prop.shape === 'slab')).toBe(true);
    expect(anomaly.bands[1]?.color).not.toBe(ruin.bands[1]?.color);
  });

  it('intensifies ground speed cues when the vehicle is dashing harder', () => {
    const state = buildRuntimeState();
    const cruising = buildRunSceneDepthView(state, 'town', 960, 640);

    state.player.vx = 280;
    state.dashBoost = 0.9;
    const sprinting = buildRunSceneDepthView(state, 'town', 960, 640);

    expect(sprinting.speedLines.length).toBeGreaterThan(cruising.speedLines.length);
    expect(sprinting.speedLines[0]?.width ?? 0).toBeGreaterThan(cruising.speedLines[0]?.width ?? 0);
  });
});
