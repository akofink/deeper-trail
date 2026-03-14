import { describe, expect, it, vi } from 'vitest';
import { connectedNeighbors } from '../src/engine/sim/world';
import { buildMapSceneRenderPlan } from '../src/game/runtime/mapSceneRenderPlan';
import { createInitialRuntimeState } from '../src/game/runtime/runtimeState';

describe('mapSceneRenderPlan', () => {
  it('builds a route card from the currently selected connected route', () => {
    const state = createInitialRuntimeState(720, 'map-scene-plan-selected-route');
    state.scene = 'map';

    const options = connectedNeighbors(state.sim);
    expect(options.length).toBeGreaterThan(0);
    state.mapSelectionIndex = options.length > 1 ? 1 : 0;

    const measureCard = vi.fn((card: { maxWidth: number; text: string }) => ({
      width: card.maxWidth - 10,
      height: card.text.split('\n').length * 16
    }));
    const measureText = vi.fn((view: { text: string }) => ({
      width: Math.max(10, view.text.length * 6),
      height: 14
    }));

    const plan = buildMapSceneRenderPlan({
      state,
      screenWidth: 960,
      screenHeight: 540,
      boardMargin: 110,
      moduleLabelCount: 6,
      measureCard,
      measureText
    });

    const selected = options[state.mapSelectionIndex] ?? options[0];
    expect(selected).toBeTruthy();
    expect(plan.cards.views.routeCard?.text).toContain(`dist ${selected?.distance}  fuel ${selected?.distance}`);
    expect(plan.cards.views.routeCard?.text).toContain(selected?.nodeId ?? '');
    expect(plan.content.completionState).toBe('LOCKED');
    expect(measureCard).toHaveBeenCalledTimes(2);
    expect(measureText).toHaveBeenCalled();
  });

  it('switches to celebration mode when the expedition is complete', () => {
    const state = createInitialRuntimeState(720, 'map-scene-plan-expedition-complete');
    state.scene = 'map';
    state.expeditionComplete = true;
    state.score = 123;

    const plan = buildMapSceneRenderPlan({
      state,
      screenWidth: 1024,
      screenHeight: 576,
      boardMargin: 110,
      moduleLabelCount: 6,
      measureCard: (card) => ({ width: card.maxWidth - 20, height: card.text.split('\n').length * 18 }),
      measureText: (view) => ({ width: Math.max(10, view.text.length * 6), height: 14 })
    });

    expect(plan.cards.views.routeCard).toBeNull();
    expect(plan.cards.views.celebrationCard?.text).toContain('SIGNAL SOURCE REACHED');
    expect(plan.cards.views.celebrationCard?.text).toContain('Seed map-scene-plan-expedition-complete complete');
    expect(plan.content.completionState).toBe('COMPLETE');
    expect(plan.chips.at(-1)?.label).toBe('N\nNew');
  });

  it('surfaces a structured decoded ending on the celebration card after a synthesized goal clear', () => {
    const state = createInitialRuntimeState(720, 'map-scene-plan-goal-ending');
    state.scene = 'map';
    state.mode = 'won';
    state.expeditionComplete = true;
    state.sim.currentNodeId = state.expeditionGoalNodeId;
    state.sim.notebook.entries.push(
      {
        id: 'clue-nature',
        clueKey: 'nature',
        sourceNodeType: 'nature',
        sourceNodeId: 'n1',
        dayDiscovered: 1,
        title: 'Nature',
        body: 'Nature'
      },
      {
        id: 'clue-ruin',
        clueKey: 'ruin',
        sourceNodeType: 'ruin',
        sourceNodeId: 'n2',
        dayDiscovered: 2,
        title: 'Ruin',
        body: 'Ruin'
      },
      {
        id: 'clue-anomaly',
        clueKey: 'anomaly',
        sourceNodeType: 'anomaly',
        sourceNodeId: 'n3',
        dayDiscovered: 3,
        title: 'Anomaly',
        body: 'Anomaly'
      }
    );
    state.sim.notebook.synthesisUnlocked = true;

    const plan = buildMapSceneRenderPlan({
      state,
      screenWidth: 1024,
      screenHeight: 576,
      boardMargin: 110,
      moduleLabelCount: 6,
      measureCard: (card) => ({ width: card.maxWidth - 20, height: card.text.split('\n').length * 18 }),
      measureText: (view) => ({ width: Math.max(10, view.text.length * 6), height: 14 })
    });

    expect(plan.cards.views.celebrationCard?.text).toContain('SIGNAL SOURCE REACHED');
    expect(plan.cards.views.celebrationCard?.text).toContain('Echo Salvage Orchard');
    expect(plan.cards.views.celebrationCard?.text).toContain('Arrival  source cache: +2 scrap on arrival');
    expect(plan.cards.views.celebrationCard?.text).toContain('Approach  grove/quarry braid: salvage echoes line the source path');
    expect(plan.cards.views.celebrationCard?.text).toContain(
      'Run assist  anomaly line: shield charge starts primed and one site objective starts stabilized'
    );
    expect(plan.cards.views.celebrationCard?.text).toContain('Afterglow  each post-goal route yields +2 salvage.');
  });
});
