import { Application, Graphics, Text } from 'pixi.js';
import { noteBiomeHazard } from './engine/sim/exploration';
import { connectedNeighbors, currentNodeType, findNode } from './engine/sim/world';
import {
  damageSubsystemForNodeType,
  getMaxHealth,
  installUpgradeForNodeType,
  repairMostDamagedSubsystem
} from './engine/sim/vehicle';
import { attemptBeaconActivation, hasBeaconAutoLink } from './game/runtime/beaconActivation';
import { decayDamageFeedback, triggerDamageFeedback } from './game/runtime/damageFeedback';
import { biomeByNodeType } from './game/runtime/runLayout';
import { buildMapActionChips, buildMapBoardView } from './game/runtime/mapBoardView';
import { buildMapSceneCardPlan, buildMapSceneCopy } from './game/runtime/mapSceneCards';
import { buildMapSceneContent } from './game/runtime/mapSceneContent';
import { buildMapSceneHudViewModel } from './game/runtime/mapSceneHudView';
import { buildMapSceneTextAssembly } from './game/runtime/mapSceneTextAssembly';
import { buildDebugStateSnapshot } from './game/runtime/debugState';
import { goalSignalEndingSummary, goalSignalProfile } from './game/runtime/goalSignal';
import { pullCollectibleTowardTarget } from './game/runtime/collectibleMagnetism';
import {
  applyCanopyLiftAssist,
  isInsideCanopyLift,
} from './game/runtime/canopyLifts';
import {
  completeCurrentNodeRun,
  hasCompletedCurrentNode,
  travelToNodeWithRuntimeEffects
} from './game/runtime/expeditionFlow';
import { runObjectiveProgress, runObjectivePrompt, updateStickyRunPrompt } from './game/runtime/runObjectiveUi';
import { updateRunObjectives } from './game/runtime/runObjectiveUpdates';
import { buildRunObjectiveVisualState } from './game/runtime/runObjectiveVisuals';
import { dashEntryEnergyCost, shouldContinueDash, shouldStartDash } from './game/runtime/runDash';
import { updateMapRotation } from './game/runtime/mapRotation';
import { buildRunSceneHudViewModel } from './game/runtime/runSceneHudView';
import { buildBeaconLabelViews, drawRunExitFlag, drawRunObjectiveVisuals } from './game/runtime/runSceneObjectiveView';
import { buildExitLockedMessage, buildRunCompletionMessage } from './game/runtime/runCompletion';
import { buildRunActionChips, buildRunSceneOverlayCard } from './game/runtime/runSceneView';
import { buildRunSceneTextAssembly } from './game/runtime/runSceneTextAssembly';
import { dashInputState, isDashHeld } from './game/runtime/runInput';
import { advanceHorizontalVelocity } from './game/runtime/runMotion';
import { tryConsumeShieldCharge } from './game/runtime/shieldCharge';
import {
  canUseMedPatch,
  COYOTE_TIME,
  createInitialRuntimeState,
  groundYForCanvasHeight,
  JUMP_BUFFER_TIME,
  MEDPATCH_HEAL_AMOUNT,
  MEDPATCH_SCRAP_COST,
  resetRunFromCurrentNode,
  shiftRunSceneVertical,
  START_X,
  tryUseMedPatch,
  type RuntimeState
} from './game/runtime/runtimeState';
import {
  collectibleMagnetRadius,
  collectibleMagnetSpeed,
  dashSpeedForState,
  hazardInvulnerabilitySeconds,
  jumpSpeedForState,
  normalizeRuntimeStateAfterVehicleChange,
  runSpeedForState,
  scrapGainPerCollectible
} from './game/runtime/vehicleDerivedStats';
import { advanceWheelRotation } from './game/runtime/vehiclePresentation';
import { drawMapBoard } from './game/render/mapBoardRenderer';
import { applyTextView, applyTextViews, clearTextLabel, measureTextView } from './game/render/pixiText';
import { beginSceneFrame } from './game/render/sceneFrame';
import {
  applyTextCard,
  drawChip,
  drawGauge,
  drawModuleMeters,
  drawPanel,
  drawPips,
  measureTextCard
} from './game/render/pixiPrimitives';
import {
  drawMapBackdrop,
  drawRunBackdropAccents,
  drawRunDamageFeedback,
  drawRunHazard,
  drawRunTerrain,
  drawVehicleAvatar
} from './game/render/runSceneRenderer';
import './styles.css';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const FIXED_DT = 1 / 60;
const GRAVITY = 1050;
const DASH_ENERGY_DRAIN_PER_SECOND = 2.6;
const DASH_ENERGY_RECOVER_PER_SECOND = 0.48;
const DASH_BOOST_RAMP_PER_SECOND = 8;
const DASH_BOOST_DECAY_PER_SECOND = 9;
const DASH_START_BOOST = 0.3;
const DASH_MIN_SPEED_RATIO = 0.62;
const JUMP_CUT_SPEED = 140;
const JUMP_CUT_MULTIPLIER = 0.52;
const FALL_GRAVITY_MULTIPLIER = 1.18;
const HANG_GRAVITY_MULTIPLIER = 0.88;

const keys = new Set<string>();
let previousSpaceDown = false;
let previousDashDown = false;
let previousMapNavigate = false;
let externalStepping = false;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function updateHazardState(state: RuntimeState): void {
  for (const hazard of state.hazards) {
    const wave = Math.sin(state.elapsedSeconds * hazard.speed + hazard.phase);
    hazard.x = hazard.baseX + wave * hazard.amplitudeX;
    hazard.y = hazard.baseY - Math.max(0, wave) * hazard.amplitudeY;
    hazard.w = hazard.baseW + (hazard.kind === 'pulsing' ? Math.max(0, wave) * hazard.pulse : 0);
    hazard.h = hazard.baseH + (hazard.kind === 'pulsing' ? Math.max(0, -wave) * hazard.pulse * 0.55 : 0);
  }
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
    if (state.mode !== 'playing') {
      previousSpaceDown = keys.has('Space');
      return;
    }

    state.elapsedSeconds += dt;
    if (state.mapMessageTimer > 0) {
      state.mapMessageTimer = Math.max(0, state.mapMessageTimer - dt);
    }
    decayDamageFeedback(state, dt);

    const p = state.player;
    const wasOnGround = p.onGround;
    const dashState = dashInputState(keys.has('ShiftLeft'), keys.has('ShiftRight'));
    const dashDown = isDashHeld(dashState);
    const dashStart = shouldStartDash(dashDown, previousDashDown, state.dashEnergy);
    if (dashStart) {
      const facing = p.vx === 0 ? p.facing : Math.sign(p.vx);
      const entryCost = dashEntryEnergyCost(p.vx, runSpeedForState(state));
      state.dashDirection = facing < 0 ? -1 : 1;
      state.dashBoost = Math.max(state.dashBoost, DASH_START_BOOST);
      state.dashEnergy = Math.max(0, state.dashEnergy - entryCost);
    }

    let move = 0;
    if (keys.has('ArrowLeft')) move -= 1;
    if (keys.has('ArrowRight')) move += 1;
    if (move !== 0) {
      p.facing = move < 0 ? -1 : 1;
    }

    const spaceDown = keys.has('Space');
    if (spaceDown && !previousSpaceDown) {
      p.jumpBufferTime = JUMP_BUFFER_TIME;
    }
    if (!spaceDown && previousSpaceDown && p.vy < -JUMP_CUT_SPEED) {
      p.vy *= JUMP_CUT_MULTIPLIER;
    }
    previousSpaceDown = spaceDown;

    p.jumpBufferTime = Math.max(0, p.jumpBufferTime - dt);
    p.coyoteTime = p.onGround ? COYOTE_TIME : Math.max(0, p.coyoteTime - dt);

    const targetSpeed = move * runSpeedForState(state);
    p.vx = advanceHorizontalVelocity(p.vx, targetSpeed, dt, p.onGround);

    const dashActive = dashStart || shouldContinueDash(dashDown, state.dashBoost, state.dashEnergy);
    if (dashActive) {
      state.dashBoost = Math.min(1, state.dashBoost + DASH_BOOST_RAMP_PER_SECOND * dt);
      state.dashEnergy = Math.max(0, state.dashEnergy - DASH_ENERGY_DRAIN_PER_SECOND * dt);
      p.invuln = Math.max(p.invuln, 0.08);
      p.vx = state.dashDirection * dashSpeedForState(state) * (DASH_MIN_SPEED_RATIO + state.dashBoost * (1 - DASH_MIN_SPEED_RATIO));
    } else {
      state.dashBoost = Math.max(0, state.dashBoost - DASH_BOOST_DECAY_PER_SECOND * dt);
      state.dashEnergy = Math.min(1, state.dashEnergy + DASH_ENERGY_RECOVER_PER_SECOND * dt);
    }
    previousDashDown = dashDown;

    const wheelRadius = 8 + Math.max(0, state.sim.vehicle.suspension - 1);
    state.wheelRotation = advanceWheelRotation(state.wheelRotation, p.vx, dt, wheelRadius);

    if (p.jumpBufferTime > 0 && (p.onGround || p.coyoteTime > 0)) {
      p.vy = -jumpSpeedForState(state);
      p.onGround = false;
      p.coyoteTime = 0;
      p.jumpBufferTime = 0;
    }

    const preMoveBounds = {
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h
    };
    for (const lift of state.canopyLifts) {
      if (lift.charted || p.onGround || !isInsideCanopyLift(lift, preMoveBounds)) continue;
      p.vy = applyCanopyLiftAssist(p.vy, dt);
      break;
    }

    const gravityMultiplier = p.vy > 0 ? FALL_GRAVITY_MULTIPLIER : Math.abs(p.vy) < 90 && spaceDown ? HANG_GRAVITY_MULTIPLIER : 1;
    const downwardSpeedBeforeGravity = p.vy;
    p.vy += GRAVITY * gravityMultiplier * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.y + p.h >= state.groundY) {
      p.y = state.groundY - p.h;
      p.vy = 0;
      p.onGround = true;
      p.coyoteTime = COYOTE_TIME;
    } else {
      p.onGround = false;
    }

    p.x = clamp(p.x, 0, state.goalX + 120);

    if (p.invuln > 0) {
      p.invuln = Math.max(0, p.invuln - dt);
    }

    updateHazardState(state);

    const playerHitbox = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 };
    const landedThisFrame = !wasOnGround && p.onGround;
    const landingSpeed = Math.max(downwardSpeedBeforeGravity, p.vy);

    for (const hazard of state.hazards) {
      if (!intersects(playerHitbox, hazard) || p.invuln > 0) continue;
      const nodeType = currentNodeType(state.sim);
      const damagedSubsystem = damageSubsystemForNodeType(state.sim, nodeType);
      noteBiomeHazard(state.sim, nodeType);
      p.invuln = hazardInvulnerabilitySeconds(state);
      p.x = Math.max(START_X, hazard.x - 80);
      p.y = state.groundY - p.h;
      p.vx = 0;
      p.vy = 0;
      p.onGround = true;
      p.coyoteTime = COYOTE_TIME;
      const shieldAbsorbed = tryConsumeShieldCharge(state);
      if (!shieldAbsorbed) {
        state.health -= 1;
        state.tookDamageThisRun = true;
      }
      triggerDamageFeedback(
        state,
        shieldAbsorbed ? 'shield' : 'health',
        hazard.x + hazard.w * 0.5,
        hazard.y + hazard.h * 0.4,
        p.x < hazard.x ? -1 : 1
      );
      state.mapMessage = shieldAbsorbed
        ? `Shield charge burned. ${damagedSubsystem} subsystem took field damage.`
        : `${damagedSubsystem} subsystem took field damage.`;
      state.mapMessageTimer = 2;
      if (state.health <= 0) state.mode = 'lost';
      break;
    }

    const px = p.x + p.w * 0.5;
    const py = p.y + p.h * 0.5;
    if (hasBeaconAutoLink(state)) {
      attemptBeaconActivation(state, 'auto');
    }
    const magnetRadius = collectibleMagnetRadius(state);
    const magnetSpeed = collectibleMagnetSpeed(state);
    for (const item of state.collectibles) {
      if (item.collected) continue;
      pullCollectibleTowardTarget(item, px, py, dt, magnetRadius, magnetSpeed);
      const rr = (item.r + 16) * (item.r + 16);
      if (distanceSq(px, py, item.x, item.y) <= rr) {
        item.collected = true;
        state.score += 10;
        state.sim.scrap += scrapGainPerCollectible(state);
      }
    }

    const objectiveUpdate = updateRunObjectives(state, {
      dt,
      landedThisFrame,
      landingSpeed
    });
    if (objectiveUpdate.message) {
      state.mapMessage = objectiveUpdate.message;
      state.mapMessageTimer = objectiveUpdate.durationSeconds;
    }

    const objectiveProgress = runObjectiveProgress(state);
    const exitReady = objectiveProgress.completed >= objectiveProgress.total;
    if (p.x + p.w >= state.goalX && !exitReady) {
      p.x = state.goalX - 64;
      state.mapMessage = buildExitLockedMessage(objectiveProgress);
      state.mapMessageTimer = 2.5;
    } else if (p.x + p.w >= state.goalX) {
      const completion = completeCurrentNodeRun(state);
      state.mapMessage = buildRunCompletionMessage({
        expeditionCompleted: completion.expeditionCompleted,
        expeditionEndingTitle: completion.expeditionCompleted ? goalSignalProfile(state)?.endingTitle : null,
        expeditionEndingCompletionNote: completion.expeditionCompleted ? goalSignalProfile(state)?.endingCompletionNote : null,
        flawlessRecovery: completion.flawlessRecovery,
        latestNotebookEntryTitle:
          completion.notebookUpdate.newEntries[completion.notebookUpdate.newEntries.length - 1]?.title
      });
      state.mapMessageTimer = 4;
    }

    const stickyPrompt = updateStickyRunPrompt(
      runObjectivePrompt(state),
      state.runPromptText,
      state.runPromptTimer,
      dt
    );
    state.runPromptText = stickyPrompt.text;
    state.runPromptTimer = stickyPrompt.timer;

    const maxCamera = Math.max(0, state.goalX - screenWidth() * 0.5);
    state.cameraX = clamp(p.x - screenWidth() * 0.35, 0, maxCamera);
  }

  function mapSelection(step: number): void {
    const options = connectedNeighbors(state.sim);
    if (options.length === 0) {
      state.mapSelectionIndex = 0;
      return;
    }
    state.mapSelectionIndex = (state.mapSelectionIndex + step + options.length) % options.length;
  }

  function tryTravelSelected(): void {
    if (state.expeditionComplete) {
      state.mapMessage = 'Expedition complete. Press N for a new world.';
      state.mapMessageTimer = 3;
      return;
    }

    if (!hasCompletedCurrentNode(state)) {
      state.mapMessage = 'Complete this node run first to unlock outbound travel.';
      state.mapMessageTimer = 3;
      return;
    }

    const options = connectedNeighbors(state.sim);
    if (options.length === 0) {
      state.mapMessage = 'No connected routes available.';
      state.mapMessageTimer = 3;
      return;
    }

    const selected = options[state.mapSelectionIndex] ?? options[0];
    if (!selected) return;

    const result = travelToNodeWithRuntimeEffects(state, selected.nodeId);
    if (!result.didTravel) {
      state.mapMessage = result.reason ?? 'Travel failed';
      state.mapMessageTimer = 3;
      return;
    }

    resetRunFromCurrentNode(state);
    state.scene = 'run';
  }

  function tryFieldRepair(): void {
    if (state.scene !== 'map') return;

    const result = repairMostDamagedSubsystem(state.sim);
    if (result.didRepair) {
      normalizeRuntimeStateAfterVehicleChange(state);
      state.mapMessage = `Fabricated repair kit: ${result.repairedSubsystem} restored to ${result.newCondition}/3 (-${result.scrapCost} scrap).`;
    } else if (result.reason?.includes('full field condition')) {
      const medPatch = tryUseMedPatch(state);
      state.mapMessage = medPatch.didHeal
        ? `Applied med patch: +${MEDPATCH_HEAL_AMOUNT} HP (-${MEDPATCH_SCRAP_COST} scrap).`
        : medPatch.reason ?? result.reason;
    } else {
      state.mapMessage = result.reason ?? 'Repair failed';
    }
    state.mapMessageTimer = 3;
  }

  function tryInstallUpgrade(): void {
    if (state.scene !== 'map') return;

    const nodeType = currentNodeType(state.sim);
    const result = installUpgradeForNodeType(state.sim, nodeType);
    if (result.didInstall) {
      normalizeRuntimeStateAfterVehicleChange(state);
      state.mapMessage = `Installed ${result.subsystem} module Lv.${result.nextLevel} at ${nodeType} site (-${result.scrapCost} scrap).`;
    } else {
      state.mapMessage = result.reason ?? 'Install failed';
    }
    state.mapMessageTimer = 3;
  }

  function stepMap(dt: number): void {
    if (state.mapMessageTimer > 0) {
      state.mapMessageTimer = Math.max(0, state.mapMessageTimer - dt);
    }

    let rotateInput = 0;
    if (keys.has('KeyQ')) rotateInput -= 1;
    if (keys.has('KeyE')) rotateInput += 1;
    updateMapRotation(state, rotateInput as -1 | 0 | 1, dt);
  }

  function drawRunScene(): void {
    const w = screenWidth();
    const h = screenHeight();
    const cam = state.cameraX;
    const nodeType = findNode(state.sim, state.sim.currentNodeId)?.type ?? 'town';
    const colors = biomeByNodeType(nodeType);
    const objectiveVisuals = buildRunObjectiveVisualState(state);

    beginSceneFrame(graphics, playerGraphics, [panelSeed, celebrationOverlay, fieldNotesText], sharedSceneTextGroups);
    graphics.rect(0, 0, w, h).fill(colors.sky);
    graphics.rect(0, h * 0.5, w, h * 0.5).fill(colors.back);
    drawRunBackdropAccents(graphics, state, nodeType, w, h);
    drawRunTerrain(graphics, nodeType, state.groundY, state.goalX, cam, w, h);
    graphics.rect(-cam, state.groundY, state.goalX + 300, h - state.groundY).fill(colors.ground);

    for (const hazard of state.hazards) {
      drawRunHazard(graphics, hazard, cam, colors.hazard);
    }
    drawRunObjectiveVisuals(graphics, objectiveVisuals, state.groundY, state.elapsedSeconds, cam);
    drawRunDamageFeedback(graphics, w, h, state, cam);
    const beaconLabelViews = buildBeaconLabelViews(objectiveVisuals, cam);

    for (const item of state.collectibles) {
      if (item.collected) continue;
      graphics.circle(item.x - cam, item.y, item.r).fill(colors.collectible);
      graphics.circle(item.x - cam, item.y, item.r - 4).fill('#fff8d6');
    }

    const objectiveProgress = runObjectiveProgress(state);
    const exitReady = objectiveProgress.completed >= objectiveProgress.total;
    drawRunExitFlag(graphics, state.goalX, state.groundY, cam, exitReady);

    drawVehicleAvatar(playerGraphics, state, cam);

    const runHudView = buildRunSceneHudViewModel(state, w, moduleLabels.length);
    const hudLayout = runHudView.layout;
    const runChips = buildRunActionChips(state, w, h);
    const runTextAssembly = buildRunSceneTextAssembly({
      beaconLabels: beaconLabelViews,
      chips: runChips,
      hud: runHudView,
      measureText: (view) => measureTextView(beaconLabels[0] ?? hud, view)
    });
    drawPanel(graphics, hudLayout.leftPanelX, 10, hudLayout.leftPanelWidth, hudLayout.leftPanelHeight);
    drawPanel(graphics, hudLayout.rightPanelX, 10, hudLayout.rightPanelWidth, hudLayout.rightPanelHeight);
    applyTextViews(beaconLabels, runTextAssembly.beaconLabels);
    applyTextViews(runLeftRowLabels, runTextAssembly.leftRowLabels);
    applyTextViews(runLeftRowValues, runTextAssembly.leftRowValues);
    applyTextViews(runRightRowLabels, runTextAssembly.rightRowLabels);
    applyTextViews(runRightRowValues, runTextAssembly.rightRowValues);
    drawPips(
      graphics,
      runHudView.healthPips.x,
      runHudView.healthPips.y,
      runHudView.healthPips.count,
      runHudView.healthPips.filled,
      runHudView.healthPips.fillColor,
      runHudView.healthPips.emptyColor
    );
    drawGauge(
      graphics,
      runHudView.fuelGauge.x,
      runHudView.fuelGauge.y,
      runHudView.fuelGauge.w,
      runHudView.fuelGauge.h,
      runHudView.fuelGauge.ratio,
      runHudView.fuelGauge.fill,
      runHudView.fuelGauge.track
    );
    drawGauge(
      graphics,
      runHudView.paceGauge.x,
      runHudView.paceGauge.y,
      runHudView.paceGauge.w,
      runHudView.paceGauge.h,
      runHudView.paceGauge.ratio,
      runHudView.paceGauge.fill,
      runHudView.paceGauge.track
    );
    drawPips(
      graphics,
      runHudView.objectivePips.x,
      runHudView.objectivePips.y,
      runHudView.objectivePips.count,
      runHudView.objectivePips.filled,
      runHudView.objectivePips.fillColor,
      runHudView.objectivePips.emptyColor
    );
    drawGauge(
      graphics,
      runHudView.boostGauge.x,
      runHudView.boostGauge.y,
      runHudView.boostGauge.w,
      runHudView.boostGauge.h,
      runHudView.boostGauge.ratio,
      runHudView.boostGauge.fill,
      runHudView.boostGauge.track
    );
    drawModuleMeters(graphics, runHudView.moduleMeters);

    applyTextView(hud, runTextAssembly.header.title);
    applyTextView(panelMeta, runTextAssembly.header.meta);
    applyTextView(panelSeed, runTextAssembly.header.seed);
    applyTextViews(moduleLabels, runTextAssembly.moduleLabels);

    const runOverlayCard = buildRunSceneOverlayCard(state, w);
    if (runOverlayCard) {
      applyTextCard(graphics, overlay, runOverlayCard);
    } else {
      clearTextLabel(overlay);
    }
    runChips.forEach((chip) => {
      drawChip(graphics, chip.x, chip.y, chip.w, chip.color, chip.height);
    });
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
    const mapSceneContent = buildMapSceneContent(state, selectedOption?.nodeId ?? null, selectedDistance, {
      canUseMedPatch: canUseMedPatch(state),
      medPatchHealAmount: MEDPATCH_HEAL_AMOUNT,
      medPatchScrapCost: MEDPATCH_SCRAP_COST,
      hasAutoLinkScanner: hasBeaconAutoLink(state),
      hasCompletedCurrentNode: hasCompletedCurrentNode(state)
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
      seed: state.seed
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
    const mapHudLayout = mapHudView.layout;
    const mapChips = buildMapActionChips(w, mapSceneLayout.chipY, mapSceneLayout.chipHeight, state.expeditionComplete);
    const mapTextAssembly = buildMapSceneTextAssembly({
      chips: mapChips,
      hud: mapHudView,
      measureText: (view) => measureTextView(mapLeftRowLabels[0] ?? hud, view)
    });
    drawPanel(graphics, mapHudLayout.leftPanelX, mapHudLayout.leftPanelY, mapHudLayout.leftPanelWidth, mapHudLayout.leftPanelHeight);
    drawPanel(graphics, mapHudLayout.rightPanelX, mapHudLayout.rightPanelY, mapHudLayout.rightPanelWidth, mapHudLayout.rightPanelHeight);
    applyTextViews(mapLeftRowLabels, mapTextAssembly.leftRowLabels);
    applyTextViews(mapLeftRowValues, mapTextAssembly.leftRowValues);
    applyTextViews(mapRightHeaderLines, mapTextAssembly.rightHeaderLines);
    drawGauge(graphics, mapHudLayout.gaugeX, mapHudView.leftRows[1].y - 6, mapHudLayout.gaugeWidth, 12, mapHudView.fuelRatio, '#38bdf8');
    drawPips(graphics, mapHudLayout.pipsX, mapHudView.leftRows[0].y - 3, mapHudView.freeTripTotal, mapHudView.freeTripFilled, '#facc15');
    drawModuleMeters(graphics, mapHudView.moduleMeters);

    applyTextView(hud, mapTextAssembly.header.title);
    applyTextView(panelMeta, mapTextAssembly.header.meta);
    applyTextView(panelSeed, mapTextAssembly.header.seed);
    applyTextViews(moduleLabels, mapTextAssembly.moduleLabels);

    const mapCardViews = mapSceneCards.views;

    if (mapCardViews.routeCard) {
      applyTextCard(graphics, overlay, mapCardViews.routeCard);
    } else {
      clearTextLabel(overlay);
    }
    applyTextCard(graphics, fieldNotesText, mapCardViews.notesCard);

    clearTextLabel(celebrationOverlay);
    if (mapCardViews.celebrationCard) {
      applyTextCard(graphics, celebrationOverlay, mapCardViews.celebrationCard);
      mapSceneLayout.celebrationAccents.forEach((accent) => {
        graphics.circle(accent.x, accent.y, accent.r).fill(accent.color);
      });
    }

    mapChips.forEach((chip) => {
      drawChip(graphics, chip.x, chip.y, chip.w, chip.color, chip.height);
    });
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

    if (event.code === 'KeyF') {
      void toggleFullscreen();
      event.preventDefault();
      return;
    }

    if (event.code === 'KeyP' && state.scene === 'run') {
      if (state.mode === 'playing') state.mode = 'paused';
      else if (state.mode === 'paused') state.mode = 'playing';
      event.preventDefault();
      return;
    }

    if (event.code === 'KeyA') {
      state.scene = state.scene === 'run' ? 'map' : 'run';
      state.mapMessage = state.scene === 'map' ? 'Choose a connected route and press Enter to travel.' : state.mapMessage;
      state.mapMessageTimer = 3;
      event.preventDefault();
      return;
    }

    if (event.code === 'KeyN' && state.scene === 'map') {
      state = createInitialRuntimeState(app.screen.height, createRunSeed());
      event.preventDefault();
      return;
    }

    if ((event.code === 'Enter' || event.code === 'KeyR') && (state.mode === 'won' || state.mode === 'lost')) {
      if (state.mode === 'lost') {
        state = createInitialRuntimeState(app.screen.height, createRunSeed());
      } else {
        resetRunFromCurrentNode(state);
        state.mode = 'playing';
      }
      event.preventDefault();
      return;
    }

    if (event.code === 'Enter' && state.scene === 'run' && state.mode === 'playing') {
      attemptBeaconActivation(state);
      event.preventDefault();
      return;
    }

    if (state.scene === 'map') {
      if (event.code === 'Enter') {
        tryTravelSelected();
        event.preventDefault();
      }
      if (event.code === 'KeyB') {
        tryFieldRepair();
        event.preventDefault();
      }
      if (event.code === 'KeyC') {
        tryInstallUpgrade();
        event.preventDefault();
      }
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        if (!previousMapNavigate) {
          mapSelection(event.code === 'ArrowUp' ? -1 : 1);
          previousMapNavigate = true;
        }
        event.preventDefault();
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      previousMapNavigate = false;
    }
  });

  window.addEventListener('resize', () => {
    const nextGroundY = groundYForCanvasHeight(screenHeight());
    const deltaY = nextGroundY - state.groundY;
    state.groundY = nextGroundY;

    if (state.scene === 'run') {
      shiftRunSceneVertical(state, deltaY);
      if (state.player.y + state.player.h > state.groundY) {
        state.player.y = state.groundY - state.player.h;
      }
      if (state.player.y + state.player.h >= state.groundY) {
        state.player.vy = 0;
        state.player.onGround = true;
      }
    } else if (state.player.y + state.player.h > state.groundY) {
      state.player.y = state.groundY - state.player.h;
      state.player.vy = 0;
      state.player.onGround = true;
    }
  });

  const gameLoop = (now: number): void => {
    const prev = (gameLoop as unknown as { previousTime?: number }).previousTime ?? now;
    (gameLoop as unknown as { previousTime?: number }).previousTime = now;

    if (!externalStepping) {
      const dt = clamp((now - prev) / 1000, 0, 0.05);
      if (state.scene === 'run') stepRun(dt);
      else stepMap(dt);

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
      else stepMap(FIXED_DT);
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
