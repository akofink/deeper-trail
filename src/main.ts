import { Application, Graphics, Text } from 'pixi.js';
import { connectedNeighbors, findNode } from './engine/sim/world';
import { getMaxHealth } from './engine/sim/vehicle';
import { biomeByNodeType } from './game/runtime/runLayout';
import { buildMapActionChips, buildMapBoardView } from './game/runtime/mapBoardView';
import { buildMapSceneCardPlan, buildMapSceneCopy } from './game/runtime/mapSceneCards';
import { buildMapSceneContent } from './game/runtime/mapSceneContent';
import {
  buildMapScannerFlags,
  stepMapScene
} from './game/runtime/mapSceneFlow';
import { buildMapSceneHudViewModel } from './game/runtime/mapSceneHudView';
import { buildMapSceneTextAssembly } from './game/runtime/mapSceneTextAssembly';
import { buildDebugStateSnapshot } from './game/runtime/debugState';
import { goalSignalEndingSummary } from './game/runtime/goalSignal';
import { runObjectiveProgress } from './game/runtime/runObjectiveUi';
import { buildRunObjectiveVisualState } from './game/runtime/runObjectiveVisuals';
import { buildRunSceneHudViewModel } from './game/runtime/runSceneHudView';
import { buildBeaconLabelViews } from './game/runtime/runSceneObjectiveView';
import { buildRunActionChips, buildRunSceneOverlayCard } from './game/runtime/runSceneView';
import { stepRunState } from './game/runtime/runStep';
import { buildRunSceneTextAssembly } from './game/runtime/runSceneTextAssembly';
import { handleShellKeyDown, handleShellKeyUp, resizeRuntimeState } from './game/runtime/shellControl';
import {
  canUseMedPatch,
  createInitialRuntimeState,
  MEDPATCH_HEAL_AMOUNT,
  MEDPATCH_SCRAP_COST
} from './game/runtime/runtimeState';
import { drawMapBoard } from './game/render/mapBoardRenderer';
import { applyTextViews, measureTextView } from './game/render/pixiText';
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
  drawSceneActionChips,
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

const keys = new Set<string>();
let previousSpaceDown = false;
let previousDashDown = false;
let previousMapNavigate = false;
let externalStepping = false;

function mapRotateInput(keysPressed: Set<string>): -1 | 0 | 1 {
  const rotateInput = (keysPressed.has('KeyE') ? 1 : 0) - (keysPressed.has('KeyQ') ? 1 : 0);
  if (rotateInput > 0) {
    return 1;
  }
  if (rotateInput < 0) {
    return -1;
  }
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

  function screenWidth(): number {
    return Math.max(1, app.screen.width);
  }

  function screenHeight(): number {
    return Math.max(1, app.screen.height);
  }

  function stepRun(dt: number): void {
    const result = stepRunState(state, {
      dt,
      screenWidth: screenWidth(),
      leftPressed: keys.has('ArrowLeft'),
      rightPressed: keys.has('ArrowRight'),
      jumpPressed: keys.has('Space'),
      dashLeftPressed: keys.has('ShiftLeft'),
      dashRightPressed: keys.has('ShiftRight'),
      previousJumpPressed: previousSpaceDown,
      previousDashPressed: previousDashDown
    });
    previousSpaceDown = result.previousJumpPressed;
    previousDashDown = result.previousDashPressed;
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
    drawSceneActionChips(graphics, runChips);
    applyTextViews(chipLabels, runTextAssembly.chipLabels);
  }

  function drawMapScene(): void {
    const w = screenWidth();
    const h = screenHeight();
    const margin = 110;

    beginSceneFrame(graphics, playerGraphics, [panelSeed, fieldNotesText], sharedSceneTextGroups);
    drawMapBackdrop(graphics, w, h);

    const options = connectedNeighbors(state.sim);
    const selectedOption = options[state.mapSelectionIndex] ?? null;
    const mapBoardView = buildMapBoardView(state, w, h, margin);
    drawMapBoard(graphics, mapBoardView);

    const selectedDistance = selectedOption?.distance ?? 0;
    const mapScannerFlags = buildMapScannerFlags(state);
    const mapSceneContent = buildMapSceneContent(state, selectedOption?.nodeId ?? null, selectedDistance, {
      canUseMedPatch: canUseMedPatch(state),
      medPatchHealAmount: MEDPATCH_HEAL_AMOUNT,
      medPatchScrapCost: MEDPATCH_SCRAP_COST,
      ...mapScannerFlags
    });
    const mapSceneCopy = buildMapSceneCopy({
      celebrationDetail: state.expeditionComplete ? goalSignalEndingSummary(state) : null,
      expeditionComplete: state.expeditionComplete,
      installHint: mapSceneContent.installHint,
      mapMessage: state.mapMessage,
      mapMessageTimer: state.mapMessageTimer,
      repairHint: mapSceneContent.repairHint,
      routeDetail: mapSceneContent.routeDetail,
      scannerHint: mapSceneContent.scannerHint,
      score: state.score,
      seed: state.seed,
      shareCode: mapSceneContent.shareCode
    });
    const mapSceneCards = buildMapSceneCardPlan({
      celebrationText: mapSceneCopy.celebrationText,
      fieldNotesText: mapSceneContent.fieldNotes.join('\n'),
      measureCard: (card) => measureTextCard(card.fill === '#0f172a' ? fieldNotesText : overlay, card),
      routeText: mapSceneCopy.routeText,
      screenHeight: h,
      screenWidth: w,
      showRouteCard: mapSceneCopy.showRouteCard
    });
    const mapSceneLayout = mapSceneCards.layout;
    const mapHudView = buildMapSceneHudViewModel(state, w, mapSceneContent.completionState, moduleLabels.length);
    const mapChips = buildMapActionChips(w, mapSceneLayout.chipY, mapSceneLayout.chipHeight, state.expeditionComplete);
    const mapTextAssembly = buildMapSceneTextAssembly({
      chips: mapChips,
      hud: mapHudView,
      measureText: (view) => measureTextView(mapLeftRowLabels[0] ?? hud, view)
    });
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
      mapHudView,
      mapTextAssembly
    );

    renderMapSceneCards(
      graphics,
      { celebrationOverlay, fieldNotesText, overlay },
      mapSceneCards.views,
      mapSceneLayout.celebrationAccents
    );

    drawSceneActionChips(graphics, mapChips);
    applyTextViews(chipLabels, mapTextAssembly.chipLabels);
  }

  async function toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await app.canvas.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    const result = handleShellKeyDown(state, event.code, {
      canvasHeight: app.screen.height,
      createSeed: createRunSeed,
      previousMapNavigate
    });
    state = result.nextState;
    previousMapNavigate = result.previousMapNavigate;

    if (result.toggleFullscreen) {
      void toggleFullscreen();
    }
    if (result.preventDefault) {
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    previousMapNavigate = handleShellKeyUp(event.code, previousMapNavigate).previousMapNavigate;
  });

  window.addEventListener('resize', () => {
    resizeRuntimeState(state, screenHeight());
  });

  const gameLoop = (now: number): void => {
    const prev = (gameLoop as unknown as { previousTime?: number }).previousTime ?? now;
    (gameLoop as unknown as { previousTime?: number }).previousTime = now;

    if (!externalStepping) {
      const dt = clamp((now - prev) / 1000, 0, 0.05);
      if (state.scene === 'run') stepRun(dt);
      else stepMapScene(state, dt, mapRotateInput(keys));

      if (state.scene === 'run') drawRunScene();
      else drawMapScene();
      app.renderer.render(app.stage);
    }

    window.requestAnimationFrame(gameLoop);
  };

  window.requestAnimationFrame(gameLoop);

  function renderGameToText(): string {
    return JSON.stringify(buildDebugStateSnapshot(state, screenWidth(), getMaxHealth(state.sim.vehicle)));
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms: number): void => {
    externalStepping = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      if (state.scene === 'run') stepRun(FIXED_DT);
      else stepMapScene(state, FIXED_DT, mapRotateInput(keys));
    }
    if (state.scene === 'run') drawRunScene();
    else drawMapScene();
    app.renderer.render(app.stage);
    externalStepping = false;
  };

  drawRunScene();
  app.renderer.render(app.stage);
}

void bootstrap();
