import { Application, Graphics, Text } from 'pixi.js';
import { noteBiomeHazard } from './engine/sim/exploration';
import { connectedNeighbors, currentNodeType, expeditionGoalNodeId, findNode } from './engine/sim/world';
import {
  getBeaconRuleForNodeType,
  getObjectiveSummary,
} from './engine/sim/runObjectives';
import {
  FIELD_REPAIR_SCRAP_COST,
  damageSubsystemForNodeType,
  getInstallOffer,
  getMaxHealth,
  installUpgradeForNodeType,
  repairMostDamagedSubsystem
} from './engine/sim/vehicle';
import { attemptBeaconActivation, hasBeaconAutoLink } from './game/runtime/beaconActivation';
import { buildDamageFeedbackView, decayDamageFeedback, triggerDamageFeedback } from './game/runtime/damageFeedback';
import { biomeByNodeType, buildRunLayout } from './game/runtime/runLayout';
import { buildMapActionChips, buildMapBoardView } from './game/runtime/mapBoardView';
import { buildMapSceneCardViews, buildMapSceneCopy } from './game/runtime/mapSceneCards';
import { buildMapSceneContent } from './game/runtime/mapSceneContent';
import { buildMapSceneHudViewModel } from './game/runtime/mapSceneHudView';
import { buildMapSceneLayout } from './game/runtime/mapSceneLayout';
import { pullCollectibleTowardTarget } from './game/runtime/collectibleMagnetism';
import { applyGoalSignalEncounterBonus, applyGoalSignalPrimer, applyGoalSignalRunBonus } from './game/runtime/goalSignal';
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
import { buildRunSceneDepthView } from './game/runtime/runSceneDepthView';
import { buildBeaconLabelViews, drawRunExitFlag, drawRunObjectiveVisuals } from './game/runtime/runSceneObjectiveView';
import { buildExitLockedMessage, buildRunCompletionMessage } from './game/runtime/runCompletion';
import { buildRunActionChips, buildRunSceneOverlayCard } from './game/runtime/runSceneView';
import { type SceneTextCardSpec } from './game/runtime/sceneTextCards';
import {
  buildCenteredTextViews,
  buildChipLabelTextViews,
  buildHudRowTextViews,
  buildModuleLabelTextViews,
  buildPanelHeaderTextViews,
  buildSceneTextCardMeasureView,
  buildSceneTextCardView,
  buildSceneTextCardWrappedMeasureView,
  buildStackedHudLabelViews,
  type SceneTextView
} from './game/runtime/sceneTextView';
import { dashInputState, isDashHeld } from './game/runtime/runInput';
import { advanceHorizontalVelocity } from './game/runtime/runMotion';
import { rechargeShieldCharge, tryConsumeShieldCharge } from './game/runtime/shieldCharge';
import type { RuntimeState } from './game/runtime/runtimeState';
import { encounterRiseAt } from './game/runtime/runTerrainProfile';
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
import { createInitialGameState } from './game/state/gameState';
import './styles.css';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const FIXED_DT = 1 / 60;
const GRAVITY = 1050;
const START_X = 80;
const PLAYER_W = 34;
const PLAYER_H = 44;
const DASH_ENERGY_DRAIN_PER_SECOND = 2.6;
const DASH_ENERGY_RECOVER_PER_SECOND = 0.48;
const DASH_BOOST_RAMP_PER_SECOND = 8;
const DASH_BOOST_DECAY_PER_SECOND = 9;
const DASH_START_BOOST = 0.3;
const DASH_MIN_SPEED_RATIO = 0.62;
const GROUND_Y_RATIO = 0.74;
const COYOTE_TIME = 0.11;
const JUMP_BUFFER_TIME = 0.12;
const JUMP_CUT_SPEED = 140;
const JUMP_CUT_MULTIPLIER = 0.52;
const FALL_GRAVITY_MULTIPLIER = 1.18;
const HANG_GRAVITY_MULTIPLIER = 0.88;
const MEDPATCH_SCRAP_COST = 2;
const MEDPATCH_HEAL_AMOUNT = 1;

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

function drawPanel(graphics: Graphics, x: number, y: number, w: number, h: number, alpha = 0.88): void {
  graphics.roundRect(x, y, w, h, 18).fill({ color: '#0f172a', alpha });
  graphics.roundRect(x, y, w, h, 18).stroke({ color: '#e2e8f0', alpha: 0.2, width: 1.5 });
}

function drawGauge(
  graphics: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  fill: string,
  track = '#1f2937'
): void {
  graphics.roundRect(x, y, w, h, Math.min(8, h * 0.5)).fill(track);
  const fillWidth = clamp(w * ratio, 0, w);
  if (fillWidth > 0) {
    graphics.roundRect(x, y, fillWidth, h, Math.min(8, h * 0.5)).fill(fill);
  }
}

function drawPips(
  graphics: Graphics,
  x: number,
  y: number,
  count: number,
  filled: number,
  fillColor: string,
  emptyColor = '#334155'
): void {
  for (let i = 0; i < count; i += 1) {
    graphics.roundRect(x + i * 16, y, 12, 12, 4).fill(i < filled ? fillColor : emptyColor);
  }
}

function drawChip(graphics: Graphics, x: number, y: number, labelWidth: number, color: string, height = 24): void {
  graphics.roundRect(x, y, labelWidth, height, 12).fill({ color, alpha: 0.14 });
  graphics.roundRect(x, y, labelWidth, height, 12).stroke({ color, alpha: 0.32, width: 1 });
}

function applyTextView(label: Text, view: SceneTextView): void {
  label.text = view.text;
  if (view.fill) label.style.fill = view.fill;
  if (view.align) label.style.align = view.align;
  if (view.fontSize) label.style.fontSize = view.fontSize;
  if (view.wordWrap !== undefined) label.style.wordWrap = view.wordWrap;
  if (view.wordWrapWidth !== undefined) label.style.wordWrapWidth = view.wordWrapWidth;
  label.x = view.x;
  label.y = view.y;
}

function measureTextView(label: Text, view: SceneTextView): { height: number; width: number } {
  applyTextView(label, {
    ...view,
    x: label.x,
    y: label.y
  });
  return {
    height: label.height,
    width: label.width
  };
}

function applyTextViews(labels: Text[], views: SceneTextView[]): void {
  labels.forEach((label, index) => {
    const view = views[index];
    if (!view) {
      label.text = '';
      return;
    }
    applyTextView(label, view);
  });
}

function drawMapBackdrop(graphics: Graphics, w: number, h: number): void {
  graphics.rect(0, 0, w, h).fill('#edf2f7');
  graphics.circle(w * 0.16, h * 0.22, 130).fill({ color: '#ffffff', alpha: 0.2 });
  graphics.circle(w * 0.78, h * 0.18, 100).fill({ color: '#dbeafe', alpha: 0.18 });
  graphics.roundRect(80, h * 0.28, w - 160, 1, 0).stroke({ color: '#cbd5e1', alpha: 0.4, width: 1 });
  graphics.roundRect(120, h * 0.52, w - 240, 1, 0).stroke({ color: '#cbd5e1', alpha: 0.28, width: 1 });
  graphics.roundRect(160, h * 0.76, w - 320, 1, 0).stroke({ color: '#cbd5e1', alpha: 0.22, width: 1 });
}

function drawMessageCard(graphics: Graphics, x: number, y: number, w: number, h: number, tone: 'dark' | 'light' = 'dark'): void {
  const color = tone === 'dark' ? '#0f172a' : '#f8fafc';
  const stroke = tone === 'dark' ? '#cbd5e1' : '#94a3b8';
  graphics.roundRect(x, y, w, h, 18).fill({ color, alpha: tone === 'dark' ? 0.88 : 0.94 });
  graphics.roundRect(x, y, w, h, 18).stroke({ color: stroke, alpha: 0.22, width: 1.2 });
}

function applyTextCard(graphics: Graphics, textNode: Text, card: SceneTextCardSpec): { width: number; height: number } {
  applyTextView(textNode, buildSceneTextCardMeasureView(card));
  const measuredWidth = textNode.width;
  applyTextView(textNode, buildSceneTextCardWrappedMeasureView(card, measuredWidth));
  const cardView = buildSceneTextCardView(card, { width: textNode.width, height: textNode.height });

  drawMessageCard(graphics, cardView.x, cardView.y, cardView.cardWidth, cardView.cardHeight, cardView.tone);

  applyTextView(textNode, cardView.text);
  return { width: cardView.cardWidth, height: cardView.cardHeight };
}

function clearTextLabels(labels: Text[]): void {
  labels.forEach((label) => {
    label.text = '';
  });
}

function applyModuleLabels(labels: Text[], moduleLayouts: Array<{ text?: string; x: number; y: number } | null | undefined>): void {
  applyTextViews(labels, buildModuleLabelTextViews(moduleLayouts));
}

function measureTextCard(textNode: Text, card: SceneTextCardSpec): { height: number; width: number } {
  applyTextView(textNode, buildSceneTextCardMeasureView(card));
  const measuredWidth = textNode.width;
  applyTextView(textNode, buildSceneTextCardWrappedMeasureView(card, measuredWidth));
  return {
    height: textNode.height,
    width: textNode.width
  };
}

function drawModuleMeters(graphics: Graphics, moduleMeters: Array<{
  cellHeight: number;
  cellWidth: number;
  conditionColor: string;
  conditionRatio: number;
  gaugeHeight: number;
  gaugeWidth: number;
  levelRatio: number;
  x: number;
  y: number;
}>): void {
  moduleMeters.forEach((meter) => {
    graphics.roundRect(meter.x, meter.y, meter.cellWidth, meter.cellHeight, 10).fill({ color: '#111827', alpha: 0.9 });
    drawGauge(graphics, meter.x + 30, meter.y + 6, meter.gaugeWidth, meter.gaugeHeight, meter.levelRatio, '#60a5fa', '#1e293b');
    drawGauge(
      graphics,
      meter.x + 30,
      meter.y + 16,
      meter.gaugeWidth,
      meter.gaugeHeight,
      meter.conditionRatio,
      meter.conditionColor,
      '#1e293b'
    );
  });
}

function drawBackdropAccents(graphics: Graphics, state: RuntimeState, nodeType: string, w: number, h: number): void {
  const depthView = buildRunSceneDepthView(state, nodeType, w, h);

  depthView.bands.forEach((band, index) => {
    if (index === 0) {
      graphics.circle(w * 0.26, band.y, Math.round(Math.max(w, h) * 0.16)).fill({ color: band.color, alpha: band.alpha });
      graphics.circle(w * 0.74, band.y + 24, Math.round(Math.max(w, h) * 0.09)).fill({ color: band.color, alpha: band.alpha * 0.7 });
      return;
    }

    graphics.roundRect(-60, band.y, w + 120, band.height, Math.round(band.height * 0.45)).fill({
      color: band.color,
      alpha: band.alpha
    });
  });

  depthView.props.forEach((prop) => {
    if (prop.shape === 'blob') {
      graphics.ellipse(prop.x + prop.width * 0.5, prop.y + prop.height * 0.68, prop.width * 0.52, prop.height * 0.38).fill({
        color: prop.color,
        alpha: prop.alpha
      });
      graphics.rect(prop.x + prop.width * 0.42, prop.y + prop.height * 0.46, prop.width * 0.16, prop.height * 0.62).fill({
        color: prop.color,
        alpha: prop.alpha * 0.9
      });
      return;
    }

    if (prop.shape === 'pillar') {
      graphics.roundRect(prop.x, prop.y, prop.width * 0.34, prop.height, 10).fill({ color: prop.color, alpha: prop.alpha });
      graphics.roundRect(prop.x + prop.width * 0.38, prop.y + prop.height * 0.18, prop.width * 0.24, prop.height * 0.82, 8).fill({
        color: prop.color,
        alpha: prop.alpha * 0.94
      });
      return;
    }

    if (prop.shape === 'slab') {
      graphics.roundRect(prop.x, prop.y + prop.height * 0.12, prop.width, prop.height * 0.88, 12).fill({
        color: prop.color,
        alpha: prop.alpha
      });
      graphics.roundRect(prop.x + prop.width * 0.12, prop.y, prop.width * 0.24, prop.height * 0.24, 8).fill({
        color: prop.color,
        alpha: prop.alpha * 0.78
      });
      return;
    }

    graphics.arc(prop.x + prop.width * 0.5, prop.y + prop.height, prop.width * 0.5, Math.PI, Math.PI * 2).stroke({
      color: prop.color,
      width: Math.max(10, prop.width * 0.16),
      alpha: prop.alpha
    });
    graphics.roundRect(prop.x + prop.width * 0.12, prop.y + prop.height * 0.22, prop.width * 0.16, prop.height * 0.78, 8).fill({
      color: prop.color,
      alpha: prop.alpha * 0.72
    });
    graphics.roundRect(prop.x + prop.width * 0.72, prop.y + prop.height * 0.22, prop.width * 0.16, prop.height * 0.78, 8).fill({
      color: prop.color,
      alpha: prop.alpha * 0.72
    });
  });

  depthView.speedLines.forEach((line) => {
    graphics.roundRect(line.x, line.y, line.width, 4, 2).fill({ color: line.color, alpha: line.alpha });
  });
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

function drawHazard(graphics: Graphics, hazard: RuntimeState['hazards'][number], cam: number, color: string): void {
  const x = hazard.x - cam;
  if (hazard.kind === 'pulsing') {
    graphics.roundRect(x, hazard.y, hazard.w, hazard.h, 8).fill({ color, alpha: 0.92 });
    graphics.roundRect(x + 8, hazard.y + 4, Math.max(0, hazard.w - 16), Math.max(0, hazard.h - 8), 6).stroke({
      color: '#f8fafc',
      alpha: 0.24,
      width: 1
    });
    return;
  }

  if (hazard.kind === 'stomper') {
    graphics.roundRect(x, hazard.y, hazard.w, hazard.h, 6).fill({ color, alpha: 0.94 });
    graphics.rect(x + Math.round(hazard.w * 0.3), hazard.baseY - 30, Math.max(6, Math.round(hazard.w * 0.4)), 26).fill({
      color,
      alpha: 0.42
    });
    return;
  }

  if (hazard.kind === 'sweeper') {
    graphics.roundRect(x, hazard.y, hazard.w, hazard.h, 5).fill({ color, alpha: 0.94 });
    graphics.circle(x + hazard.w - 8, hazard.y + hazard.h * 0.5, 6).fill({ color, alpha: 0.8 });
    return;
  }

  graphics.rect(x, hazard.y, hazard.w, hazard.h).fill(color);
}

function drawTerrainBand(
  graphics: Graphics,
  startX: number,
  endX: number,
  yBase: number,
  amplitude: number,
  wavelength: number,
  color: string,
  alpha: number,
  floorY: number
): void {
  graphics.moveTo(startX, floorY);
  graphics.lineTo(startX, yBase);
  for (let x = startX; x <= endX; x += 32) {
    const y = yBase + Math.sin(x / wavelength) * amplitude + Math.cos(x / (wavelength * 0.57)) * amplitude * 0.35;
    graphics.lineTo(x, y);
  }
  graphics.lineTo(endX, floorY);
  graphics.closePath().fill({ color, alpha });
}

function drawRunTerrain(
  graphics: Graphics,
  nodeType: string,
  groundY: number,
  goalX: number,
  cameraX: number,
  screenW: number,
  screenH: number
): void {
  const startX = Math.floor(cameraX / 64) * 64 - 160;
  const endX = cameraX + screenW + 220;
  const midColor = nodeType === 'anomaly' ? '#8b5cf6' : nodeType === 'nature' ? '#16a34a' : nodeType === 'ruin' ? '#92400e' : '#0f766e';
  const lowColor = nodeType === 'anomaly' ? '#a78bfa' : nodeType === 'nature' ? '#22c55e' : nodeType === 'ruin' ? '#b45309' : '#14b8a6';

  drawTerrainBand(graphics, startX, endX, groundY - 148, 20, 180, midColor, 0.08, groundY);
  drawTerrainBand(graphics, startX, endX, groundY - 92, 14, 128, lowColor, 0.1, groundY);

  for (let x = startX; x < Math.min(goalX + 180, endX); x += 220) {
    const profileIndex = Math.round(x / 220);
    const rise = encounterRiseAt(nodeType, profileIndex);
    const width = 68 + ((profileIndex % 3 + 3) % 3) * 18;
    const height = 14 + ((profileIndex % 2 + 2) % 2) * 8 + Math.round(rise * 0.12);
    graphics.roundRect(x, groundY - 44 - Math.round(rise * 0.45), width, height, 8).fill({ color: lowColor, alpha: 0.14 });
  }

  for (let x = startX + 60; x < endX; x += 170) {
    graphics.circle(x, groundY - 10, 8).fill({ color: '#ffffff', alpha: 0.06 });
  }

  graphics.rect(startX, groundY, endX - startX, screenH - groundY).fill({ color: '#140f33', alpha: 0.06 });
}

function drawDamageFeedback(graphics: Graphics, screenWidth: number, screenHeight: number, state: RuntimeState, cameraX: number): void {
  const feedback = buildDamageFeedbackView(state, cameraX);
  if (!feedback) return;

  graphics.rect(0, 0, screenWidth, screenHeight).fill({ color: feedback.overlayColor, alpha: feedback.overlayAlpha });
  graphics.circle(feedback.impactX, feedback.impactY, feedback.ringRadius).stroke({
    color: feedback.ringColor,
    width: 5,
    alpha: feedback.ringAlpha
  });
  feedback.sparks.forEach((spark) => {
    graphics.moveTo(spark.fromX, spark.fromY).lineTo(spark.toX, spark.toY).stroke({
      color: spark.color,
      width: spark.width,
      alpha: spark.alpha
    });
  });
}

function drawVehicleAvatar(graphics: Graphics, state: RuntimeState, cameraX: number): void {
  const p = state.player;
  const vehicle = state.sim.vehicle;
  const feedback = buildDamageFeedbackView(state, cameraX);
  const speedRatio = clamp(Math.abs(p.vx) / Math.max(1, runSpeedForState(state)), 0, 1.3);
  const dashRatio = state.dashBoost;
  const suspensionBounce = p.onGround ? Math.sin(state.elapsedSeconds * (11 + speedRatio * 4) + p.x * 0.02) * (1.4 + vehicle.suspension * 0.7) : 0;
  const lean = clamp((p.vx / Math.max(1, runSpeedForState(state))) * 0.08 + p.vy / 3400 - dashRatio * 0.07 * p.facing, -0.16, 0.16);
  const chassisPitch = clamp((-p.vy / 900) + dashRatio * 0.1, -0.12, 0.14);
  const chassisW = 44 + vehicle.frame * 4;
  const chassisH = 16 + vehicle.frame;
  const wheelR = 8 + Math.max(0, vehicle.suspension - 1);
  const centerX = p.x - cameraX + p.w * 0.5;
  const centerY = p.y + p.h * 0.62 + suspensionBounce;
  const facing = p.facing;

  graphics.position.set(centerX, centerY);
  graphics.rotation = lean + chassisPitch;

  if (dashRatio > 0) {
    for (let i = 1; i <= 3; i += 1) {
      graphics.roundRect(-chassisW * 0.5 - i * 12 * p.facing * dashRatio, -chassisH * 0.2, chassisW, chassisH, 8).fill({
        color: '#60a5fa',
        alpha: 0.06 + dashRatio * 0.07 * (4 - i)
      });
    }
  }

  graphics.ellipse(0, p.h * 0.46, 24 + speedRatio * 6 + dashRatio * 10, 6).fill({ color: '#020617', alpha: 0.2 + dashRatio * 0.05 });

  const wheelOffset = chassisW * 0.32;
  const wheelSpin = state.wheelRotation;
  graphics.circle(-wheelOffset, chassisH * 0.85, wheelR).fill('#0f172a');
  graphics.circle(wheelOffset, chassisH * 0.85, wheelR).fill('#0f172a');
  graphics.circle(-wheelOffset, chassisH * 0.85, wheelR - 3).fill('#94a3b8');
  graphics.circle(wheelOffset, chassisH * 0.85, wheelR - 3).fill('#94a3b8');
  graphics.moveTo(-wheelOffset, chassisH * 0.85).lineTo(-wheelOffset + Math.cos(wheelSpin) * (wheelR - 2), chassisH * 0.85 + Math.sin(wheelSpin) * (wheelR - 2)).stroke({ color: '#0f172a', width: 2 });
  graphics.moveTo(wheelOffset, chassisH * 0.85).lineTo(wheelOffset + Math.cos(wheelSpin) * (wheelR - 2), chassisH * 0.85 + Math.sin(wheelSpin) * (wheelR - 2)).stroke({ color: '#0f172a', width: 2 });

  graphics.roundRect(-chassisW * 0.5, -chassisH * 0.2, chassisW, chassisH, 8).fill(dashRatio > 0 ? '#2563eb' : '#1d4ed8');
  graphics.roundRect(-chassisW * 0.18, -chassisH * 0.52, chassisW * 0.36, 6, 3).fill('#60a5fa');
  if (feedback && feedback.avatarFlashAlpha > 0) {
    graphics.roundRect(-chassisW * 0.5, -chassisH * 0.2, chassisW, chassisH, 8).fill({
      color: feedback.avatarFlashColor,
      alpha: feedback.avatarFlashAlpha
    });
    graphics.roundRect(-chassisW * 0.18, -chassisH * 0.52, chassisW * 0.36, 6, 3).fill({
      color: feedback.avatarFlashColor,
      alpha: feedback.avatarFlashAlpha * 0.75
    });
  }

  if (vehicle.storage > 1) {
    graphics.roundRect(-chassisW * 0.52, -chassisH * 0.02, 12, 12, 4).fill('#92400e');
    graphics.roundRect(chassisW * 0.34, -chassisH * 0.02, 12 + (vehicle.storage - 2) * 2, 12, 4).fill('#92400e');
  }

  if (vehicle.engine > 1) {
    graphics.roundRect(chassisW * 0.42 * facing - 7, 0, 14, 8, 4).fill('#1e293b');
    if (Math.abs(p.vx) > 30 || dashRatio > 0.15) {
      graphics
        .moveTo(chassisW * 0.44 * -facing, 4)
        .lineTo(chassisW * 0.44 * -facing - facing * (12 + vehicle.engine * 3), 0)
        .lineTo(chassisW * 0.44 * -facing - facing * (12 + vehicle.engine * 3), 8)
        .closePath()
        .fill({ color: '#f59e0b', alpha: 0.75 });
    }
  }

  if (vehicle.scanner > 1) {
    graphics.rect(chassisW * 0.18 * facing, -chassisH * 1.08, 3, 18 + vehicle.scanner * 2).fill('#cbd5e1');
    graphics.circle(chassisW * 0.18 * facing + 1.5, -chassisH * 1.08, 6 + vehicle.scanner).stroke({ color: '#22d3ee', width: 2, alpha: 0.7 });
  }

  if (vehicle.shielding > 1) {
    graphics.arc(0, -2, chassisW * 0.66, Math.PI * 1.1, Math.PI * 1.9).stroke({
      color: state.shieldChargeAvailable ? '#c084fc' : '#a78bfa',
      width: 2 + (vehicle.shielding - 1) * 0.5,
      alpha: state.shieldChargeAvailable ? 0.72 : p.invuln > 0 ? 0.85 : 0.45
    });
    if (feedback?.avatarFlashAlpha) {
      graphics.arc(0, -2, chassisW * 0.72, Math.PI * 1.05, Math.PI * 1.95).stroke({
        color: state.damageFeedback?.kind === 'shield' ? '#f5f3ff' : '#fff7ed',
        width: 3,
        alpha: feedback.avatarFlashAlpha
      });
    }
  }

  graphics.moveTo(-wheelOffset + 2, chassisH * 0.24).lineTo(-wheelOffset + 2, chassisH * 0.74).stroke({ color: '#475569', width: 2 });
  graphics.moveTo(wheelOffset - 2, chassisH * 0.24).lineTo(wheelOffset - 2, chassisH * 0.74).stroke({ color: '#475569', width: 2 });
  if (vehicle.suspension > 1) {
    graphics.moveTo(-wheelOffset, chassisH * 0.28).lineTo(-6, chassisH * 0.72).stroke({ color: '#facc15', width: 2 });
    graphics.moveTo(wheelOffset, chassisH * 0.28).lineTo(6, chassisH * 0.72).stroke({ color: '#facc15', width: 2 });
  }

  graphics.roundRect(-8, -chassisH * 1.08, 16, 20, 6).fill('#1f2937');
  graphics.circle(0, -chassisH * 1.18, 9).fill('#f8c9a3');
  graphics.circle(4 * facing, -chassisH * 1.2, 1.4).fill('#0f172a');
  graphics.moveTo(2 * facing, -chassisH * 0.72).lineTo(chassisW * 0.28 * facing, -chassisH * 0.42).stroke({ color: '#e2e8f0', width: 2 });
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

function canUseMedPatch(state: RuntimeState): boolean {
  return state.health < getMaxHealth(state.sim.vehicle) && state.sim.scrap >= MEDPATCH_SCRAP_COST;
}

function tryUseMedPatch(state: RuntimeState): { didHeal: boolean; reason?: string } {
  const maxHealth = getMaxHealth(state.sim.vehicle);
  if (state.health >= maxHealth) {
    return { didHeal: false, reason: 'Hull integrity already at max HP' };
  }
  if (state.sim.scrap < MEDPATCH_SCRAP_COST) {
    return { didHeal: false, reason: `Need ${MEDPATCH_SCRAP_COST} scrap for a med patch` };
  }

  state.sim.scrap -= MEDPATCH_SCRAP_COST;
  state.health = Math.min(maxHealth, state.health + MEDPATCH_HEAL_AMOUNT);
  return { didHeal: true };
}

function makeInitialRuntimeState(canvasHeight: number, seed = createRunSeed()): RuntimeState {
  const sim = createInitialGameState(seed);
  const groundY = Math.round(canvasHeight * GROUND_Y_RATIO);
  const nodeType = currentNodeType(sim);
  const run = buildRunLayout(groundY, nodeType);
  const maxHealth = getMaxHealth(sim.vehicle);

  return {
    mode: 'playing',
    scene: 'run',
    seed,
    expeditionGoalNodeId: expeditionGoalNodeId(sim),
    expeditionComplete: false,
    score: 0,
    health: maxHealth,
    elapsedSeconds: 0,
    mapMessage: '',
    mapMessageTimer: 0,
    runPromptText: '',
    runPromptTimer: 0,
    mapSelectionIndex: 0,
    completedNodeIds: [],
    freeTravelCharges: 0,
    dashEnergy: 1,
    dashBoost: 0,
    dashDirection: 1,
    wheelRotation: 0,
    mapRotation: -0.22,
    mapRotationVelocity: 0,
    tookDamageThisRun: false,
    shieldChargeAvailable: sim.vehicle.shielding >= 2,
    damageFeedback: undefined,
    player: {
      x: START_X,
      y: groundY - PLAYER_H,
      vx: 0,
      vy: 0,
      w: PLAYER_W,
      h: PLAYER_H,
      onGround: true,
      invuln: 0,
      coyoteTime: COYOTE_TIME,
      jumpBufferTime: 0,
      facing: 1
    },
    cameraX: 0,
    goalX: run.goalX,
    groundY,
    collectibles: run.collectibles,
    hazards: run.hazards,
    beacons: run.beacons,
    serviceStops: run.serviceStops,
    syncGates: run.syncGates,
    canopyLifts: run.canopyLifts,
    impactPlates: run.impactPlates,
    sim
  };
}

function resetRunFromCurrentNode(state: RuntimeState): void {
  const nodeType = currentNodeType(state.sim);
  const run = buildRunLayout(state.groundY, nodeType);
  state.mode = 'playing';
  state.player.x = START_X;
  state.player.y = state.groundY - state.player.h;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.onGround = true;
  state.player.invuln = 0;
  state.cameraX = 0;
  state.damageFeedback = undefined;
  state.goalX = run.goalX;
  state.collectibles = run.collectibles;
  state.hazards = run.hazards;
  state.beacons = run.beacons;
  state.serviceStops = run.serviceStops;
  state.syncGates = run.syncGates;
  state.canopyLifts = run.canopyLifts;
  state.impactPlates = run.impactPlates;
  applyGoalSignalPrimer(state);
  applyGoalSignalEncounterBonus(state);
  applyGoalSignalRunBonus(state);
  state.dashEnergy = 1;
  state.dashBoost = 0;
  state.wheelRotation = 0;
  state.tookDamageThisRun = false;
  state.runPromptText = '';
  state.runPromptTimer = 0;
  rechargeShieldCharge(state);
  if (!state.expeditionComplete) {
    state.mode = 'playing';
  }
}

function shiftRunSceneVertical(state: RuntimeState, deltaY: number): void {
  if (deltaY === 0) return;

  state.player.y += deltaY;
  for (const hazard of state.hazards) {
    hazard.y += deltaY;
    hazard.baseY += deltaY;
  }
  for (const collectible of state.collectibles) {
    collectible.y += deltaY;
  }
  for (const beacon of state.beacons) {
    beacon.y += deltaY;
  }
  for (const lift of state.canopyLifts) {
    lift.y += deltaY;
  }
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

  let state = makeInitialRuntimeState(app.screen.height, initialSeedFromLocation());

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

    graphics.clear();
    playerGraphics.clear();
    panelSeed.text = '';
    celebrationOverlay.text = '';
    fieldNotesText.text = '';
    clearTextLabels(runLeftRowLabels);
    clearTextLabels(runLeftRowValues);
    clearTextLabels(runRightRowLabels);
    clearTextLabels(runRightRowValues);
    clearTextLabels(mapLeftRowLabels);
    clearTextLabels(mapLeftRowValues);
    clearTextLabels(mapRightHeaderLines);
    clearTextLabels(chipLabels);
    clearTextLabels(beaconLabels);
    graphics.rect(0, 0, w, h).fill(colors.sky);
    graphics.rect(0, h * 0.5, w, h * 0.5).fill(colors.back);
    drawBackdropAccents(graphics, state, nodeType, w, h);
    drawRunTerrain(graphics, nodeType, state.groundY, state.goalX, cam, w, h);
    graphics.rect(-cam, state.groundY, state.goalX + 300, h - state.groundY).fill(colors.ground);

    for (const hazard of state.hazards) {
      drawHazard(graphics, hazard, cam, colors.hazard);
    }
    drawRunObjectiveVisuals(graphics, objectiveVisuals, state.groundY, state.elapsedSeconds, cam);
    drawDamageFeedback(graphics, w, h, state, cam);
    const beaconLabelViews = buildBeaconLabelViews(objectiveVisuals, cam);
    const beaconMeasures = beaconLabelViews.map((view, index) => {
      const label = beaconLabels[index];
      if (!label) return { width: 0, height: 0 };
      return measureTextView(label, {
        align: 'center',
        fill: view.fill,
        text: view.text,
        x: label.x,
        y: label.y
      });
    });
    applyTextViews(beaconLabels, buildCenteredTextViews(beaconLabelViews, beaconMeasures));

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
    drawPanel(graphics, hudLayout.leftPanelX, 10, hudLayout.leftPanelWidth, hudLayout.leftPanelHeight);
    drawPanel(graphics, hudLayout.rightPanelX, 10, hudLayout.rightPanelWidth, hudLayout.rightPanelHeight);
    const runLeftLabelMeasures = runHudView.leftRows.map((row, index) =>
      measureTextView(runLeftRowLabels[index]!, { fill: '#94a3b8', text: row.label, x: runLeftRowLabels[index]!.x, y: runLeftRowLabels[index]!.y })
    );
    const runLeftValueMeasures = runHudView.leftRows.map((row, index) =>
      measureTextView(runLeftRowValues[index]!, {
        align: 'right',
        fill: '#e2e8f0',
        text: row.value,
        x: runLeftRowValues[index]!.x,
        y: runLeftRowValues[index]!.y
      })
    );
    const runLeftTextViews = buildHudRowTextViews(
      runHudView.leftRows,
      hudLayout.rowLabelX,
      hudLayout.rowValueX,
      runLeftLabelMeasures,
      runLeftValueMeasures
    );
    applyTextViews(runLeftRowLabels, runLeftTextViews.labelViews);
    applyTextViews(runLeftRowValues, runLeftTextViews.valueViews);

    const runRightLabelMeasures = runHudView.rightRows.map((row, index) =>
      measureTextView(runRightRowLabels[index]!, { fill: '#94a3b8', text: row.label, x: runRightRowLabels[index]!.x, y: runRightRowLabels[index]!.y })
    );
    const runRightValueRows = runHudView.rightRows.slice(0, runRightRowValues.length);
    const runRightValueMeasures = runRightValueRows.map((row, index) =>
      measureTextView(runRightRowValues[index]!, {
        align: 'right',
        fill: '#e2e8f0',
        text: row.value,
        x: runRightRowValues[index]!.x,
        y: runRightRowValues[index]!.y
      })
    );
    applyTextViews(
      runRightRowLabels,
      buildHudRowTextViews(runHudView.rightRows, hudLayout.rightRowLabelX, hudLayout.rightRowValueX, runRightLabelMeasures, []).labelViews
    );
    applyTextViews(
      runRightRowValues,
      buildHudRowTextViews(runRightValueRows, hudLayout.rightRowLabelX, hudLayout.rightRowValueX, [], runRightValueMeasures).valueViews
    );
    drawPips(graphics, hudLayout.leftPipsX, runHudView.leftRows[0].y - 3, runHudView.healthTotal, runHudView.healthFilled, '#f97316');
    drawGauge(graphics, hudLayout.leftGaugeX, runHudView.leftRows[1].y - 6, hudLayout.leftGaugeWidth, 12, state.sim.fuel / state.sim.fuelCapacity, '#38bdf8');
    drawGauge(
      graphics,
      hudLayout.leftGaugeX,
      runHudView.leftRows[2].y - 5,
      hudLayout.leftGaugeWidth,
      10,
      runHudView.paceRatio,
      '#f59e0b'
    );
    drawPips(graphics, hudLayout.rightPipsX, runHudView.rightRows[0].y - 3, runHudView.objectiveTotal, runHudView.objectiveCompleted, '#22c55e');
    drawGauge(graphics, hudLayout.rightGaugeX, 69, hudLayout.rightGaugeWidth, 12, state.dashEnergy, '#a78bfa');
    drawModuleMeters(graphics, runHudView.moduleMeters);

    const runHeaderLayout = runHudView.headerLayout;
    const runHeaderText = buildPanelHeaderTextViews(runHeaderLayout, runHudView);
    applyTextView(hud, runHeaderText.title);
    applyTextView(panelMeta, runHeaderText.meta);
    applyTextView(panelSeed, runHeaderText.seed);

    applyModuleLabels(moduleLabels, runHudView.moduleLabels);

    const runOverlayCard = buildRunSceneOverlayCard(state, w);
    if (runOverlayCard) {
      applyTextCard(graphics, overlay, runOverlayCard);
    } else {
      overlay.text = '';
    }
    const runChips = buildRunActionChips(state, w, h);
    runChips.forEach((chip) => {
      drawChip(graphics, chip.x, chip.y, chip.w, chip.color, chip.height);
    });
    const runChipMeasures = runChips.map((chip, index) => {
      const label = chipLabels[index];
      if (!label) return { width: 0, height: 0 };
      return measureTextView(label, {
        align: 'center',
        fill: chip.labelFill,
        text: chip.label,
        x: label.x,
        y: label.y
      });
    });
    applyTextViews(chipLabels, buildChipLabelTextViews(runChips, runChipMeasures));
  }

  function drawMapScene(): void {
    const w = screenWidth();
    const h = screenHeight();
    const margin = 110;

    graphics.clear();
    playerGraphics.clear();
    panelSeed.text = '';
    fieldNotesText.text = '';
    clearTextLabels(runLeftRowLabels);
    clearTextLabels(runLeftRowValues);
    clearTextLabels(runRightRowLabels);
    clearTextLabels(runRightRowValues);
    clearTextLabels(mapLeftRowLabels);
    clearTextLabels(mapLeftRowValues);
    clearTextLabels(mapRightHeaderLines);
    clearTextLabels(chipLabels);
    clearTextLabels(beaconLabels);
    drawMapBackdrop(graphics, w, h);

    const options = connectedNeighbors(state.sim);
    const selectedOption = options[state.mapSelectionIndex] ?? null;
    const mapBoardView = buildMapBoardView(state, w, h, margin);

    mapBoardView.edges.forEach((edge) => {
      graphics.moveTo(edge.from.x, edge.from.y).lineTo(edge.to.x, edge.to.y).stroke({
        color: edge.color,
        width: edge.width,
        alpha: edge.alpha
      });
    });

    mapBoardView.nodes.forEach((node) => {
      if (node.goal) {
        graphics.circle(node.x, node.y, node.radius + 12).stroke({ color: '#f59e0b', width: 2.5, alpha: 0.55 });
      }
      if (node.glowRadius && node.glowColor) {
        graphics.circle(node.x, node.y, node.glowRadius).fill({ color: node.glowColor, alpha: node.current ? 0.2 : 0.16 });
      }
      if (node.outline) {
        graphics.circle(node.x, node.y, node.radius + 4).stroke({ color: '#0f172a', width: 2, alpha: 0.6 });
      }
      graphics.circle(node.x, node.y, node.radius).fill(node.fill);
      if (node.innerDot) {
        graphics.circle(node.x, node.y, Math.max(2, node.radius - 5)).fill('#f8fafc');
      }
      if (node.starRadius) {
        graphics
          .moveTo(node.x, node.y - node.starRadius)
          .lineTo(node.x + 4, node.y - 2)
          .lineTo(node.x + node.starRadius, node.y)
          .lineTo(node.x + 4, node.y + 2)
          .lineTo(node.x, node.y + node.starRadius)
          .lineTo(node.x - 4, node.y + 2)
          .lineTo(node.x - node.starRadius, node.y)
          .lineTo(node.x - 4, node.y - 2)
          .closePath()
          .stroke({ color: '#fbbf24', width: 1.6, alpha: 0.65 });
      }
    });

    const selectedDistance = selectedOption?.distance ?? 0;
    const mapSceneContent = buildMapSceneContent(state, selectedOption?.nodeId ?? null, selectedDistance, {
      canUseMedPatch: canUseMedPatch(state),
      medPatchHealAmount: MEDPATCH_HEAL_AMOUNT,
      medPatchScrapCost: MEDPATCH_SCRAP_COST,
      hasAutoLinkScanner: hasBeaconAutoLink(state),
      hasCompletedCurrentNode: hasCompletedCurrentNode(state)
    });
    const mapSceneCopy = buildMapSceneCopy({
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
    const mapSceneMeasureLayout = buildMapSceneLayout(w, h, 0, 0);
    const routeMeasureCard = {
      align: 'left',
      fill: '#e2e8f0',
      fontSize: 15,
      maxWidth: mapSceneMeasureLayout.routeCard.wrapWidth + 36,
      minWidth: 220,
      paddingX: 18,
      paddingY: 16,
      text: mapSceneCopy.routeText,
      tone: 'dark',
      x: 0,
      y: 0
    } satisfies SceneTextCardSpec;
    const notesMeasureCard = {
      align: 'left',
      fill: '#0f172a',
      fontSize: 13,
      maxWidth: mapSceneMeasureLayout.notesCard.wrapWidth + 36,
      minWidth: 220,
      paddingX: 18,
      paddingY: 16,
      text: mapSceneContent.fieldNotes.join('\n'),
      tone: 'light',
      x: 0,
      y: 0
    } satisfies SceneTextCardSpec;
    const routeMeasure = measureTextCard(overlay, routeMeasureCard);
    const notesMeasure = measureTextCard(fieldNotesText, notesMeasureCard);
    const mapSceneLayout = buildMapSceneLayout(w, h, routeMeasure.height + 32, notesMeasure.height + 32);
    const mapHudView = buildMapSceneHudViewModel(state, w, mapSceneContent.completionState, moduleLabels.length);
    const mapHudLayout = mapHudView.layout;
    drawPanel(graphics, mapHudLayout.leftPanelX, mapHudLayout.leftPanelY, mapHudLayout.leftPanelWidth, mapHudLayout.leftPanelHeight);
    drawPanel(graphics, mapHudLayout.rightPanelX, mapHudLayout.rightPanelY, mapHudLayout.rightPanelWidth, mapHudLayout.rightPanelHeight);
    const mapLeftLabelMeasures = mapHudView.leftRows.map((row, index) =>
      measureTextView(mapLeftRowLabels[index]!, { fill: '#94a3b8', text: row.label, x: mapLeftRowLabels[index]!.x, y: mapLeftRowLabels[index]!.y })
    );
    const mapLeftValueMeasures = mapHudView.leftRows.map((row, index) =>
      measureTextView(mapLeftRowValues[index]!, {
        align: 'right',
        fill: '#e2e8f0',
        text: row.value,
        x: mapLeftRowValues[index]!.x,
        y: mapLeftRowValues[index]!.y
      })
    );
    const mapLeftTextViews = buildHudRowTextViews(
      mapHudView.leftRows,
      mapHudLayout.leftLabelX,
      mapHudLayout.leftValueX,
      mapLeftLabelMeasures,
      mapLeftValueMeasures
    );
    applyTextViews(mapLeftRowLabels, mapLeftTextViews.labelViews);
    applyTextViews(mapLeftRowValues, mapLeftTextViews.valueViews);

    const mapHeaderMeasures = mapHudView.rightHeaderLines.map((line, index) =>
      measureTextView(mapRightHeaderLines[index]!, {
        fill: '#94a3b8',
        text: line,
        x: mapRightHeaderLines[index]!.x,
        y: mapRightHeaderLines[index]!.y
      })
    );
    applyTextViews(
      mapRightHeaderLines,
      buildStackedHudLabelViews(
        mapHudView.rightHeaderLines,
        mapHudLayout.rightLabelX,
        [mapHudLayout.rightHeaderLine1Y, mapHudLayout.rightHeaderLine2Y],
        mapHeaderMeasures
      )
    );
    drawGauge(graphics, mapHudLayout.gaugeX, mapHudView.leftRows[1].y - 6, mapHudLayout.gaugeWidth, 12, mapHudView.fuelRatio, '#38bdf8');
    drawPips(graphics, mapHudLayout.pipsX, mapHudView.leftRows[0].y - 3, mapHudView.freeTripTotal, mapHudView.freeTripFilled, '#facc15');
    drawModuleMeters(graphics, mapHudView.moduleMeters);

    const mapHeaderLayout = mapHudView.headerLayout;
    const mapHeaderText = buildPanelHeaderTextViews(mapHeaderLayout, mapHudView);
    applyTextView(hud, mapHeaderText.title);
    applyTextView(panelMeta, mapHeaderText.meta);
    applyTextView(panelSeed, mapHeaderText.seed);

    applyModuleLabels(moduleLabels, mapHudView.moduleLabels);

    const mapCardViews = buildMapSceneCardViews({
      celebrationText: mapSceneCopy.celebrationText,
      fieldNotesText: mapSceneContent.fieldNotes.join('\n'),
      layout: mapSceneLayout,
      routeText: mapSceneCopy.routeText,
      showRouteCard: mapSceneCopy.showRouteCard
    });

    if (mapCardViews.routeCard) {
      applyTextCard(graphics, overlay, mapCardViews.routeCard);
    } else {
      overlay.text = '';
    }
    applyTextCard(graphics, fieldNotesText, mapCardViews.notesCard);

    celebrationOverlay.text = '';
    if (mapCardViews.celebrationCard) {
      applyTextCard(graphics, celebrationOverlay, mapCardViews.celebrationCard);
      mapSceneLayout.celebrationAccents.forEach((accent) => {
        graphics.circle(accent.x, accent.y, accent.r).fill(accent.color);
      });
    }

    const mapChips = buildMapActionChips(w, mapSceneLayout.chipY, mapSceneLayout.chipHeight, state.expeditionComplete);
    mapChips.forEach((chip) => {
      drawChip(graphics, chip.x, chip.y, chip.w, chip.color, chip.height);
    });
    const mapChipMeasures = mapChips.map((chip, index) => {
      const label = chipLabels[index];
      if (!label) return { width: 0, height: 0 };
      return measureTextView(label, {
        align: 'center',
        fill: chip.labelFill,
        text: chip.label,
        x: label.x,
        y: label.y
      });
    });
    applyTextViews(chipLabels, buildChipLabelTextViews(mapChips, mapChipMeasures));
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
      state = makeInitialRuntimeState(app.screen.height);
      event.preventDefault();
      return;
    }

    if ((event.code === 'Enter' || event.code === 'KeyR') && (state.mode === 'won' || state.mode === 'lost')) {
      if (state.mode === 'lost') {
        state = makeInitialRuntimeState(app.screen.height);
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
    const nextGroundY = Math.round(screenHeight() * GROUND_Y_RATIO);
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
    const options = connectedNeighbors(state.sim);
    const selectedOption = options[state.mapSelectionIndex] ?? null;
    const selectedNode = selectedOption ? findNode(state.sim, selectedOption.nodeId) ?? null : null;
    const currentNode = findNode(state.sim, state.sim.currentNodeId) ?? null;
    const visibleMinX = state.cameraX;
    const visibleMaxX = state.cameraX + screenWidth();

    const payload = {
      scene: state.scene,
      mode: state.mode,
      coordinates: 'origin at top-left, x rightward, y downward, all units are world pixels',
      sim: {
        seed: state.seed,
        day: state.sim.day,
        currentNodeId: state.sim.currentNodeId,
        currentNodeType: currentNode?.type ?? null,
        expeditionGoalNodeId: state.expeditionGoalNodeId,
        expeditionComplete: state.expeditionComplete,
        fuel: state.sim.fuel,
        fuelCapacity: state.sim.fuelCapacity,
        scrap: state.sim.scrap,
        vehicle: state.sim.vehicle,
        vehicleCondition: state.sim.vehicleCondition,
        exploration: state.sim.exploration,
        notebook: state.sim.notebook
      },
      map: {
        rotation: Number(state.mapRotation.toFixed(2)),
        travelUnlockedAtCurrentNode: hasCompletedCurrentNode(state),
        freeTravelCharges: state.freeTravelCharges,
        repairCostScrap: FIELD_REPAIR_SCRAP_COST,
        autoLinkUnlocked: hasBeaconAutoLink(state),
        dashEnergy: Number(state.dashEnergy.toFixed(2)),
        installOffer: getInstallOffer(state.sim, currentNodeType(state.sim)),
        connectedRoutes: options,
            selectedRoute: selectedOption
          ? {
              nodeId: selectedOption.nodeId,
              nodeType: selectedNode?.type ?? null,
              fuelCost: selectedOption.distance,
              objectiveRule: selectedNode ? getBeaconRuleForNodeType(selectedNode.type) : null,
              objectiveSummary: selectedNode ? getObjectiveSummary(selectedNode.type) : null,
              isGoal: selectedOption.nodeId === state.expeditionGoalNodeId
            }
          : null,
        message: state.mapMessage
      },
      run: {
        player: {
          x: Math.round(state.player.x),
          y: Math.round(state.player.y),
          vx: Math.round(state.player.vx),
          vy: Math.round(state.player.vy),
          width: state.player.w,
          height: state.player.h,
          onGround: state.player.onGround,
          invulnSeconds: Number(state.player.invuln.toFixed(2))
        },
        world: {
          groundY: state.groundY,
          goalX: state.goalX,
          distanceToGoal: Math.max(0, Math.round(state.goalX - (state.player.x + state.player.w)))
        },
        camera: {
          x: Math.round(state.cameraX),
          width: Math.round(screenWidth()),
          visibleRangeX: [Math.round(visibleMinX), Math.round(visibleMaxX)]
        },
        collectiblesRemaining: state.collectibles.filter((c) => !c.collected).length,
        beacons: state.beacons.map((b) => ({
          id: b.id,
          x: Math.round(b.x),
          y: Math.round(b.y),
          activated: b.activated
        })),
        serviceStops: state.serviceStops.map((stop) => ({
          id: stop.id,
          x: Math.round(stop.x),
          width: stop.w,
          progress: Number(stop.progress.toFixed(2)),
          serviced: stop.serviced
        })),
        syncGates: state.syncGates.map((gate) => ({
          id: gate.id,
          x: Math.round(gate.x),
          y: Math.round(gate.y),
          width: gate.w,
          height: gate.h,
          stabilized: gate.stabilized
        })),
        canopyLifts: state.canopyLifts.map((lift) => ({
          id: lift.id,
          x: Math.round(lift.x),
          y: Math.round(lift.y),
          width: lift.w,
          height: lift.h,
          progress: Number(lift.progress.toFixed(2)),
          charted: lift.charted
        })),
        impactPlates: state.impactPlates.map((plate) => ({
          id: plate.id,
          x: Math.round(plate.x),
          width: plate.w,
          shattered: plate.shattered
        })),
        objectiveRule: getBeaconRuleForNodeType(currentNode?.type ?? 'town'),
        objectiveSummary: getObjectiveSummary(currentNode?.type ?? 'town'),
        dashBoost: Number(state.dashBoost.toFixed(2)),
        dashEnergy: Number(state.dashEnergy.toFixed(2)),
        visibleHazards: state.hazards
          .filter((hz) => hz.x + hz.w >= visibleMinX && hz.x <= visibleMaxX)
          .map((hz) => ({ x: Math.round(hz.x), y: Math.round(hz.y), w: hz.w, h: hz.h }))
      },
      stats: {
        health: state.health,
        maxHealth: getMaxHealth(state.sim.vehicle),
        score: state.score,
        elapsedSeconds: Number(state.elapsedSeconds.toFixed(2))
      }
    };

    return JSON.stringify(payload);
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
