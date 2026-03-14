import { Application, Graphics, Text } from 'pixi.js';
import { getMaxHealth } from './engine/sim/vehicle';
import { stepMapScene } from './game/runtime/mapSceneFlow';
import { buildDebugStateSnapshot } from './game/runtime/debugState';
import { createFrameLoopController } from './game/runtime/frameLoop';
import { stepRunState } from './game/runtime/runStep';
import { createShellEventBridge } from './game/runtime/shellEventBridge';
import { bindShellRuntimeLoop } from './game/runtime/shellRuntimeLoop';
import { createInitialRuntimeState } from './game/runtime/runtimeState';
import { drawMapScene as renderMapScene, drawRunScene as renderRunScene } from './game/render/sceneRenderer';
import { createSceneTextNodes } from './game/render/sceneTextBootstrap';
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

  const {
    beaconLabels,
    celebrationOverlay,
    chipLabels,
    fieldNotesText,
    hud,
    mapLeftRowLabels,
    mapLeftRowValues,
    mapRightHeaderLines,
    moduleLabels,
    overlay,
    panelMeta,
    panelSeed,
    runLeftRowLabels,
    runLeftRowValues,
    runRightRowLabels,
    runRightRowValues,
    sharedSceneTextGroups
  } = createSceneTextNodes(app.stage, (options) => new Text(options));

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

  const sceneRendererContext = {
    graphics,
    labels: {
      beaconLabels,
      celebrationOverlay,
      chipLabels,
      fieldNotesText,
      hud,
      mapLeftRowLabels,
      mapLeftRowValues,
      mapRightHeaderLines,
      moduleLabels,
      overlay,
      panelMeta,
      panelSeed,
      runLeftRowLabels,
      runLeftRowValues,
      runRightRowLabels,
      runRightRowValues,
      sharedSceneTextGroups
    },
    playerGraphics,
    screenHeight,
    screenWidth
  } as const;

  function stepRun(dt: number): void {
    const input = shellEventBridge.buildRunStepInputSnapshot();
    const result = stepRunState(state, { dt, screenWidth: screenWidth(), ...input });
    shellEventBridge.updateRunStepInputResult(result);
  }

  function drawRunScene(): void {
    renderRunScene(state, sceneRendererContext);
  }

  function drawMapScene(): void {
    renderMapScene(state, sceneRendererContext);
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
