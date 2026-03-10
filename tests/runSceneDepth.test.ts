import { describe, expect, it } from 'vitest';
import { buildRunSceneDepthView } from '../src/game/runtime/runSceneDepth';

describe('runSceneDepth', () => {
  it('builds ordered depth bands with increasing parallax', () => {
    const view = buildRunSceneDepthView({
      nodeType: 'town',
      cameraX: 320,
      elapsedSeconds: 0,
      groundY: 520,
      screenWidth: 960,
      goalX: 2400,
      paceRatio: 0,
      dashRatio: 0,
      playerScreenX: 220,
      playerY: 420,
      playerWidth: 34,
      playerHeight: 44
    });

    expect(view.bands).toEqual([
      { y: 300, amplitude: 22, wavelength: 300, color: '#0f766e', alpha: 0.08, parallax: 0.1 },
      { y: 348, amplitude: 17, wavelength: 228, color: '#0d9488', alpha: 0.11, parallax: 0.18 },
      { y: 396, amplitude: 13, wavelength: 168, color: '#14b8a6', alpha: 0.14, parallax: 0.27 }
    ]);
  });

  it('switches decorative prop vocabulary by biome', () => {
    const nature = buildRunSceneDepthView({
      nodeType: 'nature',
      cameraX: 0,
      elapsedSeconds: 0,
      groundY: 520,
      screenWidth: 960,
      goalX: 2400,
      paceRatio: 0,
      dashRatio: 0,
      playerScreenX: 220,
      playerY: 420,
      playerWidth: 34,
      playerHeight: 44
    });
    const anomaly = buildRunSceneDepthView({
      nodeType: 'anomaly',
      cameraX: 0,
      elapsedSeconds: 0,
      groundY: 520,
      screenWidth: 960,
      goalX: 2400,
      paceRatio: 0,
      dashRatio: 0,
      playerScreenX: 220,
      playerY: 420,
      playerWidth: 34,
      playerHeight: 44
    });

    expect(nature.props[0]?.kind).toBe('canopy');
    expect(nature.props[0]?.parallax).toBeGreaterThan(0.3);
    expect(anomaly.props[0]?.kind).toBe('crystal');
    expect(anomaly.props[0]?.color).toMatch(/^#(8b5cf6|7c3aed)$/);
  });

  it('adds stronger motion trails as pace and dash rise', () => {
    const still = buildRunSceneDepthView({
      nodeType: 'ruin',
      cameraX: 0,
      elapsedSeconds: 0.5,
      groundY: 520,
      screenWidth: 960,
      goalX: 2400,
      paceRatio: 0.05,
      dashRatio: 0,
      playerScreenX: 220,
      playerY: 420,
      playerWidth: 34,
      playerHeight: 44
    });
    const fast = buildRunSceneDepthView({
      nodeType: 'ruin',
      cameraX: 0,
      elapsedSeconds: 0.5,
      groundY: 520,
      screenWidth: 960,
      goalX: 2400,
      paceRatio: 0.9,
      dashRatio: 0.6,
      playerScreenX: 220,
      playerY: 420,
      playerWidth: 34,
      playerHeight: 44
    });

    expect(still.motionTrails).toHaveLength(0);
    expect(fast.motionTrails.length).toBeGreaterThanOrEqual(5);
    expect(fast.motionTrails[0]?.alpha).toBeGreaterThan(0.1);
    expect(fast.motionTrails[0]?.width).toBeGreaterThan(fast.motionTrails.at(-1)?.width ?? 0);
  });
});
