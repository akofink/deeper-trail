import type { Graphics } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { triggerDamageFeedback } from '../src/game/runtime/damageFeedback';
import { biomeByNodeType } from '../src/game/runtime/runLayout';
import { buildRunObjectiveVisualState } from '../src/game/runtime/runObjectiveVisuals';
import type { RuntimeState } from '../src/game/runtime/runtimeState';
import { createInitialGameState } from '../src/game/state/gameState';
import {
  drawMapBackdrop,
  drawRunBackdropAccents,
  drawRunDamageFeedback,
  drawRunHazard,
  drawRunTerrain,
  renderRunSceneWorld,
  drawVehicleAvatar
} from '../src/game/render/runSceneRenderer';

type GraphicsOp =
  | { alpha?: number; color?: string; kind: 'fill' | 'stroke'; width?: number }
  | { h: number; kind: 'ellipse'; rx: number; ry: number; x: number; y: number }
  | { h: number; kind: 'rect' | 'roundRect'; radius?: number; w: number; x: number; y: number }
  | { kind: 'circle'; radius: number; x: number; y: number }
  | { end: number; kind: 'arc'; radius: number; start: number; x: number; y: number }
  | { kind: 'closePath' }
  | { kind: 'lineTo'; x: number; y: number }
  | { kind: 'moveTo'; x: number; y: number };

class GraphicsRecorder {
  readonly ops: GraphicsOp[] = [];
  readonly position = {
    set: (x: number, y: number) => {
      this.positionX = x;
      this.positionY = y;
    }
  };

  positionX = 0;
  positionY = 0;
  rotation = 0;

  arc(x: number, y: number, radius: number, start: number, end: number): this {
    this.ops.push({ kind: 'arc', x, y, radius, start, end });
    return this;
  }

  circle(x: number, y: number, radius: number): this {
    this.ops.push({ kind: 'circle', x, y, radius });
    return this;
  }

  closePath(): this {
    this.ops.push({ kind: 'closePath' });
    return this;
  }

  ellipse(x: number, y: number, rx: number, ry: number): this {
    this.ops.push({ kind: 'ellipse', x, y, rx, ry, h: 0 });
    return this;
  }

  fill(value: string | { alpha?: number; color?: string }): this {
    if (typeof value === 'string') {
      this.ops.push({ kind: 'fill', color: value });
    } else {
      this.ops.push({ kind: 'fill', color: value.color, alpha: value.alpha });
    }
    return this;
  }

  lineTo(x: number, y: number): this {
    this.ops.push({ kind: 'lineTo', x, y });
    return this;
  }

  moveTo(x: number, y: number): this {
    this.ops.push({ kind: 'moveTo', x, y });
    return this;
  }

  rect(x: number, y: number, w: number, h: number): this {
    this.ops.push({ kind: 'rect', x, y, w, h });
    return this;
  }

  roundRect(x: number, y: number, w: number, h: number, radius: number): this {
    this.ops.push({ kind: 'roundRect', x, y, w, h, radius });
    return this;
  }

  stroke(value: { alpha?: number; color?: string; width?: number }): this {
    this.ops.push({ kind: 'stroke', color: value.color, alpha: value.alpha, width: value.width });
    return this;
  }
}

function buildRuntimeState(): RuntimeState {
  const sim = createInitialGameState('run-renderer');
  sim.vehicle.engine = 2;
  sim.vehicle.scanner = 2;
  sim.vehicle.shielding = 2;
  sim.vehicle.storage = 2;
  sim.vehicle.suspension = 2;

  return {
    mode: 'playing',
    scene: 'run',
    seed: sim.seed,
    expeditionGoalNodeId: sim.world.nodes.at(-1)?.id ?? sim.currentNodeId,
    expeditionComplete: false,
    score: 0,
    health: 3,
    elapsedSeconds: 8,
    mapMessage: '',
    mapMessageTimer: 0,
    runPromptText: '',
    runPromptTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    legacyCarryOvers: [],
    dashEnergy: 1,
    dashBoost: 0.45,
    dashDirection: 1,
    wheelRotation: Math.PI / 4,
    mapRotation: 0,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    shieldChargeAvailable: true,
    beacons: [],
    serviceStops: [],
    syncGates: [],
    canopyLifts: [],
    impactPlates: [],
    player: {
      x: 180,
      y: 420,
      vx: 200,
      vy: -40,
      w: 34,
      h: 44,
      onGround: true,
      invuln: 0.1,
      coyoteTime: 0,
      jumpBufferTime: 0,
      facing: 1
    },
    cameraX: 80,
    goalX: 1100,
    groundY: 520,
    collectibles: [],
    hazards: [],
    damageFeedback: undefined,
    sim
  };
}

describe('runSceneRenderer', () => {
  it('draws the shared map backdrop layers and guide lines', () => {
    const graphics = new GraphicsRecorder();

    drawMapBackdrop(graphics as unknown as Graphics, 900, 600);

    expect(graphics.ops.slice(0, 6)).toEqual([
      { kind: 'rect', x: 0, y: 0, w: 900, h: 600 },
      { kind: 'fill', color: '#edf2f7' },
      { kind: 'circle', x: 144, y: 132, radius: 130 },
      { kind: 'fill', color: '#ffffff', alpha: 0.2 },
      { kind: 'circle', x: 702, y: 108, radius: 100 },
      { kind: 'fill', color: '#dbeafe', alpha: 0.18 }
    ]);
    expect(graphics.ops).toEqual(
      expect.arrayContaining([
        { kind: 'roundRect', x: 80, y: expect.closeTo(168, 8), w: 740, h: 1, radius: 0 },
        { kind: 'stroke', color: '#cbd5e1', alpha: 0.4, width: 1 },
        { kind: 'roundRect', x: 120, y: 312, w: 660, h: 1, radius: 0 },
        { kind: 'roundRect', x: 160, y: 456, w: 580, h: 1, radius: 0 }
      ])
    );
  });

  it('renders deterministic run backdrop accents and terrain passes', () => {
    const state = buildRuntimeState();
    const natureGraphics = new GraphicsRecorder();
    const anomalyGraphics = new GraphicsRecorder();

    drawRunBackdropAccents(natureGraphics as unknown as Graphics, state, 'nature', 960, 640);
    drawRunBackdropAccents(anomalyGraphics as unknown as Graphics, state, 'anomaly', 960, 640);
    drawRunTerrain(natureGraphics as unknown as Graphics, 'nature', state.groundY, state.goalX, state.cameraX, 960, 640);

    expect(natureGraphics.ops.some((op) => op.kind === 'ellipse')).toBe(true);
    expect(anomalyGraphics.ops.some((op) => op.kind === 'arc')).toBe(true);
    expect(natureGraphics.ops.some((op) => op.kind === 'roundRect' && op.radius === 8)).toBe(true);
    expect(natureGraphics.ops.some((op) => op.kind === 'fill' && op.color === '#16a34a')).toBe(true);
    expect(natureGraphics.ops.some((op) => op.kind === 'fill' && op.color === '#22c55e')).toBe(true);
  });

  it('renders the remaining run-scene world pass through one helper', () => {
    const state = buildRuntimeState();
    state.collectibles = [
      { collected: false, r: 10, x: 280, y: 360 },
      { collected: true, r: 10, x: 340, y: 340 }
    ];
    state.hazards = [
      {
        kind: 'static',
        x: 420,
        baseX: 420,
        y: 410,
        baseY: 410,
        w: 64,
        baseW: 64,
        h: 20,
        baseH: 20,
        amplitudeX: 0,
        amplitudeY: 0,
        pulse: 0,
        speed: 0,
        phase: 0
      }
    ];
    const graphics = new GraphicsRecorder();
    const colors = biomeByNodeType('nature');
    const objectiveVisuals = buildRunObjectiveVisualState(state);

    renderRunSceneWorld(
      graphics as unknown as Graphics,
      state,
      'nature',
      colors,
      objectiveVisuals,
      state.cameraX,
      960,
      640,
      false
    );

    expect(graphics.ops.slice(0, 4)).toEqual([
      { kind: 'rect', x: 0, y: 0, w: 960, h: 640 },
      { kind: 'fill', color: colors.sky },
      { kind: 'rect', x: 0, y: 320, w: 960, h: 320 },
      { kind: 'fill', color: colors.back }
    ]);
    expect(graphics.ops).toContainEqual({ kind: 'circle', x: 200, y: 360, radius: 10 });
    expect(graphics.ops).toContainEqual({ kind: 'fill', color: colors.collectible });
    expect(graphics.ops).toContainEqual({ kind: 'rect', x: 340, y: 410, w: 64, h: 20 });
    expect(graphics.ops).toContainEqual({ kind: 'fill', color: colors.hazard });
    expect(graphics.ops).toContainEqual({ kind: 'rect', x: 1020, y: 390, w: 8, h: 130 });
    expect(graphics.ops).toContainEqual({ kind: 'fill', color: '#f97316' });
  });

  it('draws each hazard variant with its distinctive accent geometry', () => {
    const graphics = new GraphicsRecorder();

    drawRunHazard(
      graphics as unknown as Graphics,
      {
        kind: 'pulsing',
        x: 140,
        baseX: 140,
        y: 410,
        baseY: 410,
        w: 40,
        baseW: 40,
        h: 24,
        baseH: 24,
        amplitudeX: 0,
        amplitudeY: 0,
        pulse: 0,
        speed: 0,
        phase: 0
      },
      100,
      '#ef4444'
    );
    drawRunHazard(
      graphics as unknown as Graphics,
      {
        kind: 'stomper',
        x: 220,
        baseX: 220,
        y: 360,
        baseY: 360,
        w: 32,
        baseW: 32,
        h: 48,
        baseH: 48,
        amplitudeX: 0,
        amplitudeY: 0,
        pulse: 0,
        speed: 0,
        phase: 0
      },
      100,
      '#ef4444'
    );
    drawRunHazard(
      graphics as unknown as Graphics,
      {
        kind: 'sweeper',
        x: 320,
        baseX: 320,
        y: 388,
        baseY: 388,
        w: 52,
        baseW: 52,
        h: 16,
        baseH: 16,
        amplitudeX: 0,
        amplitudeY: 0,
        pulse: 0,
        speed: 0,
        phase: 0
      },
      100,
      '#ef4444'
    );

    expect(graphics.ops).toEqual(
      expect.arrayContaining([
        { kind: 'roundRect', x: 40, y: 410, w: 40, h: 24, radius: 8 },
        { kind: 'stroke', color: '#f8fafc', alpha: 0.24, width: 1 },
        { kind: 'rect', x: 130, y: 330, w: 13, h: 26 },
        { kind: 'circle', x: 264, y: 396, radius: 6 }
      ])
    );
  });

  it('renders damage feedback overlay and vehicle avatar presentation from runtime state', () => {
    const state = buildRuntimeState();
    const damageGraphics = new GraphicsRecorder();
    const avatarGraphics = new GraphicsRecorder();

    triggerDamageFeedback(state, 'shield', 220, 430, 1);
    drawRunDamageFeedback(damageGraphics as unknown as Graphics, 960, 640, state, state.cameraX);
    drawVehicleAvatar(avatarGraphics as unknown as Graphics, state, state.cameraX);

    expect(damageGraphics.ops[0]).toEqual({ kind: 'rect', x: 0, y: 0, w: 960, h: 640 });
    expect(damageGraphics.ops[1]).toEqual({ kind: 'fill', color: '#c084fc', alpha: expect.any(Number) });
    expect(damageGraphics.ops.some((op) => op.kind === 'stroke' && op.color === '#e9d5ff')).toBe(true);
    expect(avatarGraphics.positionX).toBe(117);
    expect(avatarGraphics.positionY).toBeGreaterThan(440);
    expect(avatarGraphics.rotation).not.toBe(0);
    expect(avatarGraphics.ops.some((op) => op.kind === 'arc')).toBe(true);
    expect(avatarGraphics.ops.some((op) => op.kind === 'fill' && op.color === '#1d4ed8')).toBe(false);
    expect(avatarGraphics.ops.some((op) => op.kind === 'fill' && op.color === '#2563eb')).toBe(true);
  });
});
