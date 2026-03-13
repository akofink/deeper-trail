import { Application, Graphics, Text } from 'pixi.js';
import { findNode } from './engine/sim/world';
import { getMaxHealth } from './engine/sim/vehicle';
import { biomeByNodeType } from './game/runtime/runLayout';
import { stepMapScene } from './game/runtime/mapSceneFlow';
import { buildMapSceneRenderPlan } from './game/runtime/mapSceneRenderPlan';
import { buildDebugStateSnapshot } from './game/runtime/debugState';
import { createFrameLoopController } from './game/runtime/frameLoop';
import { runObjectiveProgress } from './game/runtime/runObjectiveUi';
import { buildRunObjectiveVisualState } from './game/runtime/runObjectiveVisuals';
import { buildRunSceneHudViewModel } from './game/runtime/runSceneHudView';
import { buildBeaconLabelViews } from './game/runtime/runSceneObjectiveView';
import { buildRunActionChips, buildRunSceneOverlayCard } from './game/runtime/runSceneView';
import { stepRunState } from './game/runtime/runStep';
import { buildRunSceneTextAssembly } from './game/runtime/runSceneTextAssembly';
import { createShellEventBridge } from './game/runtime/shellEventBridge';
import { bindShellRuntimeLoop } from './game/runtime/shellRuntimeLoop';
import { createInitialRuntimeState } from './game/runtime/runtimeState';
import { drawMapBoard } from './game/render/mapBoardRenderer';
import { measureTextView } from './game/render/pixiText';
import { beginSceneFrame } from './game/render/sceneFrame';
import { measureTextCard } from './game/render/pixiPrimitives';
import {
  drawMapBackdrop,
  renderRunSceneWorld,
  drawVehicleAvatar
} from './game/render/runSceneRenderer';
import {
  applyOptionalTextCard,
  renderMapSceneCards,
  renderSceneActionChips,
  renderMapSceneHud,
  renderRunSceneHud
} from './game/render/sceneHudRenderer';
import './styles.css';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const FIXED_DT = 1 / 60;

function createRunSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1679616)
    .toString(36)
    .padStart(4, '0')}`;
}

function initialSeedFromLocation(): string | undefined {
  const value = new URLSearchParams(window.location.search).get('seed')?.trim();
  return value ? value : undefined;
}

async function bootstrap(): Promise<void> {
  const app = new Application();
  await app.init({ background: '#89c3f0', resizeTo: window, antialias: true });

  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw new Error('Expected #app root element.');
  root.appendChild(app.canvas);
  app.ticker.stop();

  const graphics = new Graphics();
  app.stage.addChild(graphics);
  const playerGraphics = new Graphics();
  app.stage.addChild(playerGraphics);

  const hud = new Text({
    text: '',
    style: { fill: '#12263a', fontSize: 20, fontFamily: 'monospace', fontWeight: '700' }
  });
  hud.x = 16;
  hud.y = 12;
  app.stage.addChild(hud);

  const overlay = new Text({
    text: '',
    style: { fill: '#102a43', fontSize: 25, fontFamily: 'monospace', fontWeight: '700', align: 'center' }
  });
  app.stage.addChild(overlay);

  const celebrationOverlay = new Text({
    text: '',
    style: { fill: '#f8fafc', fontSize: 18, fontFamily: 'monospace', fontWeight: '700', align: 'center' }
  });
  app.stage.addChild(celebrationOverlay);

  const chipLabels = Array.from({ length: 6 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#dbeafe', fontSize: 14, fontFamily: 'monospace', fontWeight: '600' }
    });
    app.stage.addChild(label);
    return label;
  });

  const panelMeta = new Text({
    text: '',
    style: { fill: '#cbd5e1', fontSize: 14, fontFamily: 'monospace', fontWeight: '700' }
  });
  app.stage.addChild(panelMeta);

  const panelSeed = new Text({
    text: '',
    style: { fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
  });
  app.stage.addChild(panelSeed);

  const fieldNotesText = new Text({
    text: '',
    style: { fill: '#0f172a', fontSize: 13, fontFamily: 'monospace', fontWeight: '700' }
  });
  app.stage.addChild(fieldNotesText);

  const runLeftRowLabels = Array.from({ length: 3 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
    });
    app.stage.addChild(label);
    return label;
  });

  const runLeftRowValues = Array.from({ length: 3 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
    });
    app.stage.addChild(label);
    return label;
  });

  const runRightRowLabels = Array.from({ length: 3 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
    });
    app.stage.addChild(label);
    return label;
  });

  const runRightRowValues = Array.from({ length: 2 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
    });
    app.stage.addChild(label);
    return label;
  });

  const mapLeftRowLabels = Array.from({ length: 2 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
    });
    app.stage.addChild(label);
    return label;
  });

  const mapLeftRowValues = Array.from({ length: 2 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
    });
    app.stage.addChild(label);
    return label;
  });

  const mapRightHeaderLines = Array.from({ length: 2 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
    });
    app.stage.addChild(label);
    return label;
  });

  const moduleLabels = Array.from({ length: 6 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#cbd5e1', fontSize: 10, fontFamily: 'monospace', fontWeight: '700' }
    });
    app.stage.addChild(label);
    return label;
  });

  const beaconLabels = Array.from({ length: 3 }, () => {
    const label = new Text({
      text: '',
      style: { fill: '#111827', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', align: 'center' }
    });
    app.stage.addChild(label);
    return label;
  });

  const sharedSceneTextGroups = {
    runLeftRowLabels,
    runLeftRowValues,
    runRightRowLabels,
    runRightRowValues,
    mapLeftRowLabels,
    mapLeftRowValues,
    mapRightHeaderLines,
    chipLabels,
    beaconLabels
  };

  let state = createInitialRuntimeState(app.screen.height, initialSeedFromLocation() ?? createRunSeed());
  const shellEventBridge = createShellEventBridge({
    createSeed: createRunSeed,
    getCanvasHeight: () => app.screen.height,
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    }
  });

  function screenWidth(): number {
    return Math.max(1, app.screen.width);
  }

  function screenHeight(): number {
    return Math.max(1, app.screen.height);
  }

  function stepRun(dt: number): void {
    const input = shellEventBridge.buildRunStepInputSnapshot();
    const result = stepRunState(state, { dt, screenWidth: screenWidth(), ...input });
    shellEventBridge.updateRunStepInputResult(result);
  }

  function drawRunScene(): void {
    const w = screenWidth();
    const h = screenHeight();
    const cam = state.cameraX;
    const nodeType = findNode(state.sim, state.sim.currentNodeId)?.type ?? 'town';
    const colors = biomeByNodeType(nodeType);
    const objectiveVisuals = buildRunObjectiveVisualState(state);
    const objectiveProgress = runObjectiveProgress(state);
    const exitReady = objectiveProgress.completed >= objectiveProgress.total;

    beginSceneFrame(graphics, playerGraphics, [panelSeed, celebrationOverlay, fieldNotesText], sharedSceneTextGroups);
    renderRunSceneWorld(graphics, state, nodeType, colors, objectiveVisuals, cam, w, h, exitReady);
    const beaconLabelViews = buildBeaconLabelViews(objectiveVisuals, cam);

    drawVehicleAvatar(playerGraphics, state, cam);

    const runHudView = buildRunSceneHudViewModel(state, w, moduleLabels.length);
    const runChips = buildRunActionChips(state, w, h);
    const runTextAssembly = buildRunSceneTextAssembly({
      beaconLabels: beaconLabelViews,
      chips: runChips,
      hud: runHudView,
      measureText: (view) => measureTextView(beaconLabels[0] ?? hud, view)
    });
    renderRunSceneHud(
      graphics,
      {
        beaconLabels,
        hud,
        leftRowLabels: runLeftRowLabels,
        leftRowValues: runLeftRowValues,
        moduleLabels,
        panelMeta,
        panelSeed,
        rightRowLabels: runRightRowLabels,
        rightRowValues: runRightRowValues
      },
      runHudView,
      runTextAssembly
    );

    const runOverlayCard = buildRunSceneOverlayCard(state, w);
    applyOptionalTextCard(graphics, overlay, runOverlayCard);
    renderSceneActionChips(graphics, chipLabels, runChips, runTextAssembly.chipLabels);
  }

  function drawMapScene(): void {
    const w = screenWidth();
    const h = screenHeight();
    const margin = 110;

    beginSceneFrame(graphics, playerGraphics, [panelSeed, fieldNotesText], sharedSceneTextGroups);
    drawMapBackdrop(graphics, w, h);
    const plan = buildMapSceneRenderPlan({
      state,
      screenWidth: w,
      screenHeight: h,
      boardMargin: margin,
      moduleLabelCount: moduleLabels.length,
      measureCard: (card) => measureTextCard(card.fill === '#0f172a' ? fieldNotesText : overlay, card),
      measureText: (view) => measureTextView(mapLeftRowLabels[0] ?? hud, view)
    });
    drawMapBoard(graphics, plan.boardView);
    renderMapSceneHud(
      graphics,
      {
        hud,
        leftRowLabels: mapLeftRowLabels,
        leftRowValues: mapLeftRowValues,
        moduleLabels,
        panelMeta,
        panelSeed,
        rightHeaderLines: mapRightHeaderLines
      },
      plan.hudView,
      plan.textAssembly
    );

    renderMapSceneCards(
      graphics,
      { celebrationOverlay, fieldNotesText, overlay },
      plan.cards.views,
      plan.cards.layout.celebrationAccents
    );

    renderSceneActionChips(graphics, chipLabels, plan.chips, plan.textAssembly.chipLabels);
  }

  async function toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await app.canvas.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }

  const frameLoop = createFrameLoopController(FIXED_DT, {
    currentScene: () => state.scene,
    drawMap: drawMapScene,
    drawRun: drawRunScene,
    renderFrame: () => {
      app.renderer.render(app.stage);
    },
    stepMap: (dt) => {
      stepMapScene(state, dt, shellEventBridge.mapRotateInput());
    },
    stepRun
  });

  bindShellRuntimeLoop(window, {
    onAnimationFrame: frameLoop.onAnimationFrame,
    onKeyDown: shellEventBridge.onKeyDown,
    onKeyUp: shellEventBridge.onKeyUp,
    onResize: shellEventBridge.onResize,
    onToggleFullscreen: toggleFullscreen
  });

  function renderGameToText(): string {
    return JSON.stringify(buildDebugStateSnapshot(state, screenWidth(), getMaxHealth(state.sim.vehicle)));
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = frameLoop.advanceTime;

  drawRunScene();
  app.renderer.render(app.stage);
}

void bootstrap();
