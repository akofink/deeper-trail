import { describe, expect, it } from 'vitest';
import { buildMapSceneCopy, buildMapSceneHudLayout } from '../src/game/runtime/mapSceneCards';

describe('map scene card copy', () => {
  it('shows the route card while an expedition is still active', () => {
    const copy = buildMapSceneCopy({
      expeditionComplete: false,
      installHint: 'Install available',
      mapMessage: 'Route locked',
      mapMessageTimer: 0,
      repairHint: 'Repair available',
      routeDetail: 'Route board details',
      scannerHint: 'Scanner offline',
      score: 312,
      seed: 'abc123'
    });

    expect(copy.showRouteCard).toBe(true);
    expect(copy.celebrationText).toBeNull();
    expect(copy.routeText).toContain('Route board details');
    expect(copy.routeText).toContain('Complete this node to travel.');
  });

  it('replaces the route card with a celebration card once the expedition is complete', () => {
    const copy = buildMapSceneCopy({
      expeditionComplete: true,
      installHint: 'Install available',
      mapMessage: 'Route locked',
      mapMessageTimer: 1,
      repairHint: 'Repair available',
      routeDetail: 'Route board details',
      scannerHint: 'Scanner offline',
      score: 735,
      seed: '6618abd4'
    });

    expect(copy.showRouteCard).toBe(false);
    expect(copy.celebrationText).toContain('SIGNAL SOURCE REACHED');
    expect(copy.celebrationText).toContain('Seed 6618abd4 complete');
    expect(copy.routeText).toContain('Route locked');
  });

  it('keeps the map HUD panels inset and their contents inside the panel bounds', () => {
    const layout = buildMapSceneHudLayout(1280);

    expect(layout.leftPanelX).toBe(20);
    expect(layout.rightPanelX + layout.rightPanelWidth).toBe(1260);
    expect(layout.hudX).toBeGreaterThan(layout.leftPanelX);
    expect(layout.leftValueX).toBeLessThan(layout.leftPanelX + layout.leftPanelWidth);
    expect(layout.pipsX + 44).toBeLessThan(layout.leftPanelX + layout.leftPanelWidth);
    expect(layout.moduleX).toBeGreaterThan(layout.rightPanelX);
    expect(layout.rightLabelX).toBeGreaterThan(layout.rightPanelX);
  });
});
