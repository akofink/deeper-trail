import type { Graphics, Text } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { createInitialRuntimeState, type RuntimeState } from '../src/game/runtime/runtimeState';
import {
  drawMapScene,
  drawRunScene,
  type SceneRendererContext,
  type SceneRendererDependencies
} from '../src/game/render/sceneRenderer';
import type { SceneTextNodes } from '../src/game/render/sceneTextBootstrap';

function createTextNode(width: number, height: number): Text {
  return {
    height,
    style: {},
    text: '',
    width,
    x: 0,
    y: 0
  } as Text;
}

function createLabels(): SceneTextNodes {
  const beaconLabels = [createTextNode(44, 11), createTextNode(44, 11), createTextNode(44, 11)];
  const chipLabels = Array.from({ length: 6 }, () => createTextNode(72, 14));
  const mapLeftRowLabels = [createTextNode(55, 12), createTextNode(55, 12)];
  const mapLeftRowValues = [createTextNode(60, 12), createTextNode(60, 12)];
  const mapRightHeaderLines = [createTextNode(66, 12), createTextNode(66, 12)];
  const moduleLabels = Array.from({ length: 6 }, () => createTextNode(36, 10));
  const runLeftRowLabels = [createTextNode(48, 12), createTextNode(48, 12), createTextNode(48, 12)];
  const runLeftRowValues = [createTextNode(48, 12), createTextNode(48, 12), createTextNode(48, 12)];
  const runRightRowLabels = [createTextNode(48, 12), createTextNode(48, 12), createTextNode(48, 12)];
  const runRightRowValues = [createTextNode(48, 12), createTextNode(48, 12)];

  return {
    beaconLabels,
    celebrationOverlay: createTextNode(90, 18),
    chipLabels,
    fieldNotesText: createTextNode(70, 13),
    hud: createTextNode(160, 20),
    mapLeftRowLabels,
    mapLeftRowValues,
    mapRightHeaderLines,
    moduleLabels,
    overlay: createTextNode(81, 25),
    panelMeta: createTextNode(90, 14),
    panelSeed: createTextNode(80, 11),
    runLeftRowLabels,
    runLeftRowValues,
    runRightRowLabels,
    runRightRowValues,
    sharedSceneTextGroups: {
      beaconLabels,
      chipLabels,
      mapLeftRowLabels,
      mapLeftRowValues,
      mapRightHeaderLines,
      runLeftRowLabels,
      runLeftRowValues,
      runRightRowLabels,
      runRightRowValues
    }
  };
}

function createContext(labels = createLabels()): SceneRendererContext {
  return {
    graphics: {} as Graphics,
    labels,
    playerGraphics: {} as Graphics,
    screenHeight: () => 640,
    screenWidth: () => 960
  };
}

function createState(): RuntimeState {
  const state = createInitialRuntimeState(640, 'scene-render-seed');
  state.cameraX = 123;
  return state;
}

describe('sceneRenderer', () => {
  it('routes run-scene drawing through the shared orchestration helper', () => {
    const state = createState();
    const context = createContext();
    const calls: string[] = [];
    let measuredWidth = 0;
    let measuredHeight = 0;
    const plan = {
      chips: [{ color: '#38bdf8', height: 24, label: 'Jump', labelFill: '#e2e8f0', w: 72, x: 20, y: 580 }],
      exitReady: true,
      hudView: { kind: 'run-hud' },
      nodeType: 'nature',
      objectiveVisuals: { kind: 'visuals' },
      overlayCard: { text: 'Proceed' },
      textAssembly: { chipLabels: [{ text: 'Jump', x: 28, y: 586 }] }
    };

    const dependencies: SceneRendererDependencies = {
      beginSceneFrame: vi.fn(() => {
        calls.push('beginSceneFrame');
      }),
      biomeByNodeType: vi.fn(() => {
        calls.push('biomeByNodeType');
        return { sky: '#0ea5e9' } as ReturnType<SceneRendererDependencies['biomeByNodeType']>;
      }),
      buildMapSceneRenderPlan: vi.fn(),
      buildRunSceneRenderPlan: vi.fn((input) => {
        calls.push('buildRunSceneRenderPlan');
        const measured = input.measureText({ text: 'B1', x: 20, y: 30 } as never);
        measuredWidth = measured.width;
        measuredHeight = measured.height;
        return plan as never;
      }),
      drawMapBackdrop: vi.fn(),
      drawMapBoard: vi.fn(),
      drawVehicleAvatar: vi.fn(() => {
        calls.push('drawVehicleAvatar');
      }),
      renderMapSceneCards: vi.fn(),
      renderMapSceneHud: vi.fn(),
      renderRunSceneHud: vi.fn(() => {
        calls.push('renderRunSceneHud');
      }),
      renderRunSceneWorld: vi.fn(() => {
        calls.push('renderRunSceneWorld');
      }),
      applyOptionalTextCard: vi.fn(() => {
        calls.push('applyOptionalTextCard');
      }),
      renderSceneActionChips: vi.fn(() => {
        calls.push('renderSceneActionChips');
      })
    };

    drawRunScene(state, context, dependencies);

    expect(measuredWidth).toBe(44);
    expect(measuredHeight).toBe(11);
    expect(dependencies.buildRunSceneRenderPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraX: 123,
        moduleLabelCount: 6,
        screenHeight: 640,
        screenWidth: 960,
        state
      })
    );
    expect(dependencies.beginSceneFrame).toHaveBeenCalledWith(
      context.graphics,
      context.playerGraphics,
      [context.labels.panelSeed, context.labels.celebrationOverlay, context.labels.fieldNotesText],
      context.labels.sharedSceneTextGroups
    );
    expect(dependencies.renderRunSceneWorld).toHaveBeenCalledWith(
      context.graphics,
      state,
      'nature',
      { sky: '#0ea5e9' },
      plan.objectiveVisuals,
      123,
      960,
      640,
      true
    );
    expect(dependencies.drawVehicleAvatar).toHaveBeenCalledWith(context.playerGraphics, state, 123);
    expect(dependencies.renderRunSceneHud).toHaveBeenCalledWith(
      context.graphics,
      expect.objectContaining({
        beaconLabels: context.labels.beaconLabels,
        leftRowLabels: context.labels.runLeftRowLabels,
        rightRowValues: context.labels.runRightRowValues
      }),
      plan.hudView,
      plan.textAssembly
    );
    expect(dependencies.applyOptionalTextCard).toHaveBeenCalledWith(context.graphics, context.labels.overlay, plan.overlayCard);
    expect(dependencies.renderSceneActionChips).toHaveBeenCalledWith(
      context.graphics,
      context.labels.chipLabels,
      plan.chips,
      plan.textAssembly.chipLabels
    );
    expect(calls).toEqual([
      'buildRunSceneRenderPlan',
      'biomeByNodeType',
      'beginSceneFrame',
      'renderRunSceneWorld',
      'drawVehicleAvatar',
      'renderRunSceneHud',
      'applyOptionalTextCard',
      'renderSceneActionChips'
    ]);
  });

  it('routes map-scene drawing through the shared orchestration helper', () => {
    const state = createState();
    state.scene = 'map';
    const context = createContext();
    const calls: string[] = [];
    let darkCardWidth = 0;
    let lightCardWidth = 0;
    let measuredTextWidth = 0;
    const plan = {
      boardView: { kind: 'board' },
      cards: {
        layout: { celebrationAccents: [{ color: '#f59e0b', r: 6, x: 320, y: 40 }] },
        views: { celebration: { text: 'done' } }
      },
      chips: [{ color: '#22c55e', height: 24, label: 'Travel', labelFill: '#0f172a', w: 80, x: 24, y: 584 }],
      content: { routeDetail: 'Route' },
      hudView: { kind: 'map-hud' },
      textAssembly: { chipLabels: [{ text: 'Travel', x: 36, y: 590 }] }
    };

    const dependencies: SceneRendererDependencies = {
      beginSceneFrame: vi.fn(() => {
        calls.push('beginSceneFrame');
      }),
      biomeByNodeType: vi.fn(),
      buildMapSceneRenderPlan: vi.fn((input) => {
        calls.push('buildMapSceneRenderPlan');
        darkCardWidth = input.measureCard({
          fill: '#0f172a',
          maxWidth: 200,
          minWidth: 120,
          paddingX: 10,
          paddingY: 10,
          text: 'Field notes',
          tone: 'dark',
          x: 0,
          y: 0
        }).width;
        lightCardWidth = input.measureCard({
          fill: '#f8fafc',
          maxWidth: 200,
          minWidth: 120,
          paddingX: 10,
          paddingY: 10,
          text: 'Overlay',
          tone: 'light',
          x: 0,
          y: 0
        }).width;
        measuredTextWidth = input.measureText({ text: 'Trips', x: 20, y: 30 } as never).width;
        return plan as never;
      }),
      buildRunSceneRenderPlan: vi.fn(),
      drawMapBackdrop: vi.fn(() => {
        calls.push('drawMapBackdrop');
      }),
      drawMapBoard: vi.fn(() => {
        calls.push('drawMapBoard');
      }),
      drawVehicleAvatar: vi.fn(),
      renderMapSceneCards: vi.fn(() => {
        calls.push('renderMapSceneCards');
      }),
      renderMapSceneHud: vi.fn(() => {
        calls.push('renderMapSceneHud');
      }),
      renderRunSceneHud: vi.fn(),
      renderRunSceneWorld: vi.fn(),
      applyOptionalTextCard: vi.fn(),
      renderSceneActionChips: vi.fn(() => {
        calls.push('renderSceneActionChips');
      })
    };

    drawMapScene(state, context, dependencies);

    expect(darkCardWidth).toBe(70);
    expect(lightCardWidth).toBe(81);
    expect(measuredTextWidth).toBe(55);
    expect(dependencies.buildMapSceneRenderPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        boardMargin: 110,
        moduleLabelCount: 6,
        screenHeight: 640,
        screenWidth: 960,
        state
      })
    );
    expect(dependencies.beginSceneFrame).toHaveBeenCalledWith(
      context.graphics,
      context.playerGraphics,
      [context.labels.panelSeed, context.labels.fieldNotesText],
      context.labels.sharedSceneTextGroups
    );
    expect(dependencies.drawMapBackdrop).toHaveBeenCalledWith(context.graphics, 960, 640);
    expect(dependencies.drawMapBoard).toHaveBeenCalledWith(context.graphics, plan.boardView);
    expect(dependencies.renderMapSceneHud).toHaveBeenCalledWith(
      context.graphics,
      expect.objectContaining({
        leftRowLabels: context.labels.mapLeftRowLabels,
        rightHeaderLines: context.labels.mapRightHeaderLines
      }),
      plan.hudView,
      plan.textAssembly
    );
    expect(dependencies.renderMapSceneCards).toHaveBeenCalledWith(
      context.graphics,
      {
        celebrationOverlay: context.labels.celebrationOverlay,
        fieldNotesText: context.labels.fieldNotesText,
        overlay: context.labels.overlay
      },
      plan.cards.views,
      plan.cards.layout.celebrationAccents
    );
    expect(dependencies.renderSceneActionChips).toHaveBeenCalledWith(
      context.graphics,
      context.labels.chipLabels,
      plan.chips,
      plan.textAssembly.chipLabels
    );
    expect(calls).toEqual([
      'buildMapSceneRenderPlan',
      'beginSceneFrame',
      'drawMapBackdrop',
      'drawMapBoard',
      'renderMapSceneHud',
      'renderMapSceneCards',
      'renderSceneActionChips'
    ]);
  });
});
