import { describe, expect, it } from 'vitest';
import {
  buildMapSceneCardPlan,
  buildMapSceneCardViews,
  buildMapSceneCopy,
  buildMapSceneHudLayout,
  buildMapSceneMeasureCardSpecs
} from '../src/game/runtime/mapSceneCards';
import { buildMapSceneLayout } from '../src/game/runtime/mapSceneLayout';

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

  it('builds reusable route, notes, and celebration card views from the map copy and layout', () => {
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
    const layout = buildMapSceneLayout(1280, 720, 180, 140);

    const views = buildMapSceneCardViews({
      celebrationText: copy.celebrationText,
      fieldNotesText: 'Visited ruin 1x',
      layout,
      routeText: copy.routeText,
      showRouteCard: copy.showRouteCard
    });

    expect(views.routeCard).toBeNull();
    expect(views.notesCard).toEqual({
      align: 'left',
      fill: '#0f172a',
      fontSize: 13,
      maxWidth: layout.notesCard.maxWidth,
      minWidth: layout.notesCard.minWidth,
      paddingX: 18,
      paddingY: 16,
      text: 'Visited ruin 1x',
      tone: 'light',
      x: layout.notesCard.x,
      y: layout.notesCard.y
    });
    expect(views.celebrationCard).toMatchObject({
      align: 'center',
      fill: '#f8fafc',
      fontSize: 18,
      tone: 'dark',
      x: layout.celebrationCard.x,
      y: layout.celebrationCard.y
    });
  });

  it('builds dedicated measurement cards from the temporary wrap-width layout', () => {
    const layout = buildMapSceneLayout(960, 540, 0, 0);

    expect(
      buildMapSceneMeasureCardSpecs({
        fieldNotesText: 'Visited ruin 1x',
        layout,
        routeText: 'Route board details'
      })
    ).toEqual({
      notesCard: {
        align: 'left',
        fill: '#0f172a',
        fontSize: 13,
        maxWidth: layout.notesCard.wrapWidth + 36,
        minWidth: 220,
        paddingX: 18,
        paddingY: 16,
        text: 'Visited ruin 1x',
        tone: 'light',
        x: 0,
        y: 0
      },
      routeCard: {
        align: 'left',
        fill: '#e2e8f0',
        fontSize: 15,
        maxWidth: layout.routeCard.wrapWidth + 36,
        minWidth: 220,
        paddingX: 18,
        paddingY: 16,
        text: 'Route board details',
        tone: 'dark',
        x: 0,
        y: 0
      }
    });
  });

  it('plans measured map cards before building the final positioned card views', () => {
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
    const measuredWidths: number[] = [];
    const plan = buildMapSceneCardPlan({
      celebrationText: copy.celebrationText,
      fieldNotesText: 'Visited ruin 1x\nNotebook clue tracked',
      measureCard: (card) => {
        measuredWidths.push(card.maxWidth);
        return { width: card.maxWidth - 40, height: card.text.split('\n').length * 18 };
      },
      routeText: copy.routeText,
      screenHeight: 540,
      screenWidth: 960,
      showRouteCard: copy.showRouteCard
    });

    const measureLayout = buildMapSceneLayout(960, 540, 0, 0);

    expect(measuredWidths).toEqual([measureLayout.routeCard.wrapWidth + 36, measureLayout.notesCard.wrapWidth + 36]);
    expect(plan.layout.routeCard.y).toBeLessThanOrEqual(plan.layout.chipY - 46);
    expect(plan.views.routeCard).toMatchObject({
      text: copy.routeText,
      x: plan.layout.routeCard.x,
      y: plan.layout.routeCard.y
    });
    expect(plan.views.notesCard).toMatchObject({
      text: 'Visited ruin 1x\nNotebook clue tracked',
      x: plan.layout.notesCard.x,
      y: plan.layout.notesCard.y
    });
  });
});
