import { Application, Graphics, Text } from 'pixi.js';
import { noteBiomeHazard } from './engine/sim/exploration';
import { connectedNeighbors, currentNodeType, expeditionGoalNodeId, findNode } from './engine/sim/world';
import {
  canActivateBeacon,
  getBeaconRuleForNodeType,
  getBeaconRuleLabel,
  getObjectiveSummary,
} from './engine/sim/runObjectives';
import {
  FIELD_REPAIR_SCRAP_COST,
  damageSubsystemForNodeType,
  getInstallOffer,
  getMaxHealth,
  hasAutoLinkScanner,
  installUpgradeForNodeType,
  repairMostDamagedSubsystem
} from './engine/sim/vehicle';
import { biomeByNodeType, buildRunLayout } from './game/runtime/runLayout';
import { buildMapActionChips, buildMapBoardView } from './game/runtime/mapBoardView';
import { buildMapSceneCopy } from './game/runtime/mapSceneCards';
import { buildMapSceneContent } from './game/runtime/mapSceneContent';
import { buildMapSceneHudViewModel } from './game/runtime/mapSceneHudView';
import { buildMapSceneLayout } from './game/runtime/mapSceneLayout';
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
import { runObjectiveProgress } from './game/runtime/runObjectiveUi';
import { updateRunObjectives } from './game/runtime/runObjectiveUpdates';
import { buildRunObjectiveVisualState } from './game/runtime/runObjectiveVisuals';
import { dashEntryEnergyCost, shouldContinueDash, shouldStartDash } from './game/runtime/runDash';
import { updateMapRotation } from './game/runtime/mapRotation';
import { buildRunSceneHudViewModel } from './game/runtime/runSceneHudView';
import { buildBeaconLabelViews, drawRunExitFlag, drawRunObjectiveVisuals } from './game/runtime/runSceneObjectiveView';
import { buildRunActionChips, buildRunSceneOverlayCard } from './game/runtime/runSceneView';
import { dashInputState, isDashHeld } from './game/runtime/runInput';
import { advanceHorizontalVelocity } from './game/runtime/runMotion';
import { rechargeShieldCharge, tryConsumeShieldCharge } from './game/runtime/shieldCharge';
import type { RuntimeState } from './game/runtime/runtimeState';
import {
  beaconInteractRadius,
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

function layoutChipLabel(label: Text, text: string, x: number, y: number, width: number, fill: string, height = 24): void {
  label.text = text;
  label.style.fill = fill;
  label.style.align = 'center';
  label.x = x + Math.round((width - label.width) * 0.5);
  label.y = y + Math.round((height - label.height) * 0.5);
}

function layoutHudRowLabel(label: Text, text: string, x: number, centerY: number, fill = '#94a3b8'): void {
  label.text = text;
  label.style.fill = fill;
  label.x = x;
  label.y = Math.round(centerY - label.height * 0.5);
}

function layoutHudRowValue(label: Text, text: string, rightX: number, centerY: number, fill = '#e2e8f0'): void {
  label.text = text;
  label.style.fill = fill;
  label.x = Math.round(rightX - label.width);
  label.y = Math.round(centerY - label.height * 0.5);
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

function layoutTextCard(
  graphics: Graphics,
  text: Text,
  textValue: string,
  options: {
    tone?: 'dark' | 'light';
    x: number;
    y: number;
    maxWidth: number;
    minWidth?: number;
    paddingX?: number;
    paddingY?: number;
    align?: 'left' | 'center';
    fill?: string;
    fontSize?: number;
  }
): { width: number; height: number } {
  const paddingX = options.paddingX ?? 18;
  const paddingY = options.paddingY ?? 14;
  text.text = textValue;
  text.style.wordWrap = true;
  text.style.wordWrapWidth = Math.max(120, options.maxWidth - paddingX * 2);
  text.style.align = options.align ?? 'left';
  text.style.fill = options.fill ?? (options.tone === 'light' ? '#0f172a' : '#e2e8f0');
  if (options.fontSize) {
    text.style.fontSize = options.fontSize;
  }

  const desiredWidth = Math.max(options.minWidth ?? 220, Math.min(options.maxWidth, text.width + paddingX * 2));
  text.style.wordWrapWidth = desiredWidth - paddingX * 2;
  const cardHeight = text.height + paddingY * 2;

  drawMessageCard(graphics, options.x, options.y, desiredWidth, cardHeight, options.tone ?? 'dark');

  if ((options.align ?? 'left') === 'center') {
    text.x = options.x + Math.round((desiredWidth - text.width) * 0.5);
  } else {
    text.x = options.x + paddingX;
  }
  text.y = options.y + Math.round((cardHeight - text.height) * 0.5);
  return { width: desiredWidth, height: cardHeight };
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

function drawBackdropAccents(graphics: Graphics, nodeType: string, w: number, h: number, groundY: number, cameraX: number): void {
  if (nodeType === 'anomaly') {
    graphics.circle(w * 0.24 - cameraX * 0.04, h * 0.18, 70).fill({ color: '#ddd6fe', alpha: 0.24 });
    graphics.circle(w * 0.72 - cameraX * 0.03, h * 0.24, 42).fill({ color: '#c4b5fd', alpha: 0.2 });
    graphics.roundRect(-cameraX * 0.08, groundY - 180, w * 0.9, 18, 9).fill({ color: '#8b5cf6', alpha: 0.08 });
    graphics.roundRect(w * 0.3 - cameraX * 0.1, groundY - 240, w * 0.45, 14, 7).fill({ color: '#7c3aed', alpha: 0.1 });
    return;
  }

  if (nodeType === 'nature') {
    graphics.circle(w * 0.18 - cameraX * 0.03, h * 0.2, 64).fill({ color: '#bbf7d0', alpha: 0.22 });
    graphics.roundRect(-cameraX * 0.08, groundY - 140, w * 0.3, 80, 30).fill({ color: '#16a34a', alpha: 0.08 });
    graphics.roundRect(w * 0.55 - cameraX * 0.1, groundY - 170, w * 0.24, 110, 34).fill({ color: '#15803d', alpha: 0.08 });
    return;
  }

  if (nodeType === 'ruin') {
    graphics.circle(w * 0.18 - cameraX * 0.02, h * 0.19, 74).fill({ color: '#fde68a', alpha: 0.18 });
    graphics.rect(w * 0.12 - cameraX * 0.08, groundY - 150, 42, 90).fill({ color: '#92400e', alpha: 0.1 });
    graphics.rect(w * 0.66 - cameraX * 0.1, groundY - 210, 54, 150).fill({ color: '#78350f', alpha: 0.1 });
    return;
  }

  graphics.circle(w * 0.2 - cameraX * 0.03, h * 0.18, 64).fill({ color: '#dbeafe', alpha: 0.22 });
  graphics.roundRect(-cameraX * 0.08, groundY - 120, w * 0.28, 56, 22).fill({ color: '#0f766e', alpha: 0.08 });
  graphics.roundRect(w * 0.62 - cameraX * 0.1, groundY - 150, w * 0.2, 82, 22).fill({ color: '#115e59', alpha: 0.08 });
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
    const width = 68 + ((x / 220) % 3) * 18;
    const height = 14 + ((x / 220) % 2) * 8;
    graphics.roundRect(x, groundY - 44 - (x % 440 === 0 ? 18 : 0), width, height, 8).fill({ color: lowColor, alpha: 0.12 });
  }

  for (let x = startX + 60; x < endX; x += 170) {
    graphics.circle(x, groundY - 10, 8).fill({ color: '#ffffff', alpha: 0.06 });
  }

  graphics.rect(startX, groundY, endX - startX, screenH - groundY).fill({ color: '#140f33', alpha: 0.06 });
}

function drawVehicleAvatar(graphics: Graphics, state: RuntimeState, cameraX: number): void {
  const p = state.player;
  const vehicle = state.sim.vehicle;
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
    mapMessage: 'Press A to open map and travel between connected nodes.',
    mapMessageTimer: 3,
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
  state.goalX = run.goalX;
  state.collectibles = run.collectibles;
  state.hazards = run.hazards;
  state.beacons = run.beacons;
  state.serviceStops = run.serviceStops;
  state.syncGates = run.syncGates;
  state.canopyLifts = run.canopyLifts;
  state.impactPlates = run.impactPlates;
  state.dashEnergy = 1;
  state.dashBoost = 0;
  state.wheelRotation = 0;
  state.tookDamageThisRun = false;
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

function hasBeaconAutoLink(state: RuntimeState): boolean {
  return hasAutoLinkScanner(state.sim.vehicle);
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

    for (const hazard of state.hazards) {
      if (hazard.kind !== 'moving') continue;
      hazard.x = hazard.baseX + Math.sin(state.elapsedSeconds * hazard.speed + hazard.phase) * hazard.amplitude;
    }

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
      tryActivateBeacon('auto');
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
      const pendingParts: string[] = [];
      if (objectiveProgress.beaconsRemaining > 0) {
        pendingParts.push(
          `${objectiveProgress.beaconsRemaining} relay${objectiveProgress.beaconsRemaining === 1 ? '' : 's'}`
        );
      }
      if (objectiveProgress.serviceStopsRemaining > 0) {
        pendingParts.push(
          `${objectiveProgress.serviceStopsRemaining} service ${objectiveProgress.serviceStopsRemaining === 1 ? 'bay' : 'bays'}`
        );
      }
      if (objectiveProgress.syncGatesRemaining > 0) {
        pendingParts.push(
          `${objectiveProgress.syncGatesRemaining} sync ${objectiveProgress.syncGatesRemaining === 1 ? 'gate' : 'gates'}`
        );
      }
      if (objectiveProgress.canopyLiftsRemaining > 0) {
        pendingParts.push(
          `${objectiveProgress.canopyLiftsRemaining} canopy ${objectiveProgress.canopyLiftsRemaining === 1 ? 'lift' : 'lifts'}`
        );
      }
      if (objectiveProgress.impactPlatesRemaining > 0) {
        pendingParts.push(
          `${objectiveProgress.impactPlatesRemaining} impact ${objectiveProgress.impactPlatesRemaining === 1 ? 'plate' : 'plates'}`
        );
      }
      state.mapMessage = `Exit locked: finish ${pendingParts.join(' and ')}.`;
      state.mapMessageTimer = 2.5;
    } else if (p.x + p.w >= state.goalX) {
      const completion = completeCurrentNodeRun(state);
      state.mapMessage =
        completion.flawlessRecovery > 0
          ? 'Trail complete: route data synced. Clean run restored +1 HP and unlocked +1 free trip.'
          : 'Trail complete: route data synced. +1 free travel charge unlocked.';
      if (completion.notebookUpdate.newEntries.length > 0) {
        const latestTitle = completion.notebookUpdate.newEntries[completion.notebookUpdate.newEntries.length - 1]?.title ?? 'new clue';
        state.mapMessage += ` Notebook updated: ${latestTitle}.`;
      }
      if (completion.expeditionCompleted) {
        state.mapMessage = 'Signal source reached. Expedition complete. Press N for a new expedition.';
      }
      state.mapMessageTimer = 4;
    }

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

  function tryActivateBeacon(trigger: 'manual' | 'auto' = 'manual'): boolean {
    if (state.scene !== 'run' || state.mode !== 'playing') return false;
    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;
    const interactRadius = beaconInteractRadius(state);
    const nodeType = currentNodeType(state.sim);
    for (let index = 0; index < state.beacons.length; index += 1) {
      const beacon = state.beacons[index];
      if (beacon.activated) continue;
      const rr = (beacon.r + interactRadius) * (beacon.r + interactRadius);
      if (distanceSq(px, py, beacon.x, beacon.y) <= rr) {
        const activation = canActivateBeacon({
          nodeType,
          beaconIndex: index,
          beacons: state.beacons,
          currentSpeed: Math.abs(state.player.vx),
          dashBoost: state.dashBoost,
          isAirborne: !state.player.onGround,
          elapsedSeconds: state.elapsedSeconds,
          scanLocked: beacon.scanLocked
        });
        if (!activation.canActivate) {
          if (trigger === 'manual') {
            state.mapMessage = activation.reason ?? getBeaconRuleLabel(nodeType);
            state.mapMessageTimer = 2.2;
          }
          continue;
        }
        beacon.activated = true;
        state.score += 15;
        state.mapMessage =
          trigger === 'auto'
            ? `Scanner auto-linked ${beacon.id.toUpperCase()} (${state.beacons.filter((b) => b.activated).length}/${state.beacons.length}).`
            : `Beacon ${beacon.id.toUpperCase()} linked (${state.beacons.filter((b) => b.activated).length}/${state.beacons.length}).`;
        state.mapMessageTimer = 2.5;
        return true;
      }
    }
    if (trigger === 'manual') {
      state.mapMessage = 'No inactive beacon in range.';
      state.mapMessageTimer = 1.5;
    }
    return false;
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
    runLeftRowLabels.forEach((label) => {
      label.text = '';
    });
    runLeftRowValues.forEach((label) => {
      label.text = '';
    });
    runRightRowLabels.forEach((label) => {
      label.text = '';
    });
    runRightRowValues.forEach((label) => {
      label.text = '';
    });
    mapLeftRowLabels.forEach((label) => {
      label.text = '';
    });
    mapLeftRowValues.forEach((label) => {
      label.text = '';
    });
    mapRightHeaderLines.forEach((label) => {
      label.text = '';
    });
    chipLabels.forEach((label) => {
      label.text = '';
    });
    beaconLabels.forEach((label) => {
      label.text = '';
    });
    graphics.rect(0, 0, w, h).fill(colors.sky);
    graphics.rect(0, h * 0.5, w, h * 0.5).fill(colors.back);
    drawBackdropAccents(graphics, nodeType, w, h, state.groundY, cam);
    drawRunTerrain(graphics, nodeType, state.groundY, state.goalX, cam, w, h);
    graphics.rect(-cam, state.groundY, state.goalX + 300, h - state.groundY).fill(colors.ground);

    for (const hazard of state.hazards) {
      graphics.rect(hazard.x - cam, hazard.y, hazard.w, hazard.h).fill(colors.hazard);
    }
    drawRunObjectiveVisuals(graphics, objectiveVisuals, state.groundY, state.elapsedSeconds, cam);
    const beaconLabelViews = buildBeaconLabelViews(objectiveVisuals, cam);
    beaconLabelViews.forEach((view, index) => {
      const label = beaconLabels[index];
      if (!label) return;
      label.text = view.text;
      label.style.fill = view.fill;
      label.x = view.x - Math.round(label.width * 0.5);
      label.y = view.y - Math.round(label.height * 0.5);
    });

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
    runHudView.leftRows.forEach((row, index) => {
      layoutHudRowLabel(runLeftRowLabels[index], row.label, hudLayout.rowLabelX, row.y);
      layoutHudRowValue(runLeftRowValues[index], row.value, hudLayout.rowValueX, row.y);
    });
    runHudView.rightRows.forEach((row, index) => {
      layoutHudRowLabel(runRightRowLabels[index], row.label, hudLayout.rightRowLabelX, row.y);
      if (index < 2) {
        layoutHudRowValue(runRightRowValues[index], row.value, hudLayout.rightRowValueX, row.y);
      }
    });
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
    hud.text = runHudView.title;
    hud.style.fontSize = 18;
    hud.style.fill = '#e2e8f0';
    hud.x = runHeaderLayout.titleX;
    hud.y = runHeaderLayout.titleY;
    panelMeta.text = runHudView.meta;
    panelMeta.style.fill = '#cbd5e1';
    panelMeta.style.fontSize = 12;
    panelMeta.x = runHeaderLayout.metaX;
    panelMeta.y = runHeaderLayout.metaY;
    panelSeed.text = runHudView.seed;
    panelSeed.style.fill = '#94a3b8';
    panelSeed.x = runHeaderLayout.seedX;
    panelSeed.y = runHeaderLayout.seedY;

    moduleLabels.forEach((label, index) => {
      const layout = runHudView.moduleLabels[index];
      label.text = layout?.text ?? '';
      label.style.fill = '#cbd5e1';
      label.x = layout?.x ?? 0;
      label.y = layout?.y ?? 0;
    });

    const runOverlayCard = buildRunSceneOverlayCard(state, w);
    if (runOverlayCard) {
      layoutTextCard(graphics, overlay, runOverlayCard.text, {
        tone: 'dark',
        x: runOverlayCard.x,
        y: runOverlayCard.y,
        maxWidth: runOverlayCard.maxWidth,
        minWidth: runOverlayCard.minWidth,
        paddingX: runOverlayCard.paddingX,
        paddingY: runOverlayCard.paddingY,
        align: 'center',
        fill: '#e2e8f0',
        fontSize: runOverlayCard.fontSize
      });
    } else {
      overlay.text = '';
    }
    const chipY = h - 58;
    const chipHeight = 34;
    const runChips = buildRunActionChips(state);
    runChips.forEach((chip, index) => {
      drawChip(graphics, chip.x, chipY, chip.w, chip.color, chipHeight);
      const label = chipLabels[index];
      if (label) layoutChipLabel(label, chip.label, chip.x, chipY, chip.w, '#dbeafe', chipHeight);
    });
  }

  function drawMapScene(): void {
    const w = screenWidth();
    const h = screenHeight();
    const margin = 110;

    graphics.clear();
    playerGraphics.clear();
    panelSeed.text = '';
    fieldNotesText.text = '';
    runLeftRowLabels.forEach((label) => {
      label.text = '';
    });
    runLeftRowValues.forEach((label) => {
      label.text = '';
    });
    runRightRowLabels.forEach((label) => {
      label.text = '';
    });
    runRightRowValues.forEach((label) => {
      label.text = '';
    });
    mapLeftRowLabels.forEach((label) => {
      label.text = '';
    });
    mapLeftRowValues.forEach((label) => {
      label.text = '';
    });
    mapRightHeaderLines.forEach((label) => {
      label.text = '';
    });
    chipLabels.forEach((label) => {
      label.text = '';
    });
    beaconLabels.forEach((label) => {
      label.text = '';
    });
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
    overlay.text = mapSceneCopy.routeText;
    overlay.style.wordWrap = true;
    overlay.style.fontSize = 15;
    fieldNotesText.text = mapSceneContent.fieldNotes.join('\n');
    fieldNotesText.style.wordWrap = true;
    fieldNotesText.style.fontSize = 13;
    const mapSceneMeasureLayout = buildMapSceneLayout(w, h, 0, 0);
    overlay.style.wordWrapWidth = mapSceneMeasureLayout.routeCard.wrapWidth;
    fieldNotesText.style.wordWrapWidth = mapSceneMeasureLayout.notesCard.wrapWidth;
    const mapSceneLayout = buildMapSceneLayout(w, h, overlay.height + 32, fieldNotesText.height + 32);
    const mapHudView = buildMapSceneHudViewModel(state, w, mapSceneContent.completionState, moduleLabels.length);
    const mapHudLayout = mapHudView.layout;
    drawPanel(graphics, mapHudLayout.leftPanelX, mapHudLayout.leftPanelY, mapHudLayout.leftPanelWidth, mapHudLayout.leftPanelHeight);
    drawPanel(graphics, mapHudLayout.rightPanelX, mapHudLayout.rightPanelY, mapHudLayout.rightPanelWidth, mapHudLayout.rightPanelHeight);
    mapHudView.leftRows.forEach((row, index) => {
      layoutHudRowLabel(mapLeftRowLabels[index], row.label, mapHudLayout.leftLabelX, row.y);
      layoutHudRowValue(mapLeftRowValues[index], row.value, mapHudLayout.leftValueX, row.y);
    });
    mapHudView.rightHeaderLines.forEach((line, index) => {
      const y = index === 0 ? mapHudLayout.rightHeaderLine1Y : mapHudLayout.rightHeaderLine2Y;
      layoutHudRowLabel(mapRightHeaderLines[index], line, mapHudLayout.rightLabelX, y);
    });
    drawGauge(graphics, mapHudLayout.gaugeX, mapHudView.leftRows[1].y - 6, mapHudLayout.gaugeWidth, 12, mapHudView.fuelRatio, '#38bdf8');
    drawPips(graphics, mapHudLayout.pipsX, mapHudView.leftRows[0].y - 3, mapHudView.freeTripTotal, mapHudView.freeTripFilled, '#facc15');
    drawModuleMeters(graphics, mapHudView.moduleMeters);

    const mapHeaderLayout = mapHudView.headerLayout;
    hud.text = mapHudView.title;
    hud.style.fontSize = 18;
    hud.style.fill = '#e2e8f0';
    hud.x = mapHeaderLayout.titleX;
    hud.y = mapHeaderLayout.titleY;
    panelMeta.text = mapHudView.meta;
    panelMeta.style.fill = '#cbd5e1';
    panelMeta.style.fontSize = 12;
    panelMeta.x = mapHeaderLayout.metaX;
    panelMeta.y = mapHeaderLayout.metaY;
    panelSeed.text = mapHudView.seed;
    panelSeed.style.fill = '#94a3b8';
    panelSeed.x = mapHeaderLayout.seedX;
    panelSeed.y = mapHeaderLayout.seedY;

    moduleLabels.forEach((label, index) => {
      const layout = mapHudView.moduleLabels[index];
      label.text = layout?.text ?? '';
      label.style.fill = '#cbd5e1';
      label.x = layout?.x ?? 0;
      label.y = layout?.y ?? 0;
    });

    if (mapSceneCopy.showRouteCard) {
      layoutTextCard(graphics, overlay, mapSceneCopy.routeText, {
        tone: 'dark',
        x: mapSceneLayout.routeCard.x,
        y: mapSceneLayout.routeCard.y,
        maxWidth: mapSceneLayout.routeCard.maxWidth,
        minWidth: mapSceneLayout.routeCard.minWidth,
        paddingX: 18,
        paddingY: 16,
        align: 'left',
        fill: '#e2e8f0',
        fontSize: 15
      });
    } else {
      overlay.text = '';
    }
    layoutTextCard(graphics, fieldNotesText, mapSceneContent.fieldNotes.join('\n'), {
      tone: 'light',
      x: mapSceneLayout.notesCard.x,
      y: mapSceneLayout.notesCard.y,
      maxWidth: mapSceneLayout.notesCard.maxWidth,
      minWidth: mapSceneLayout.notesCard.minWidth,
      paddingX: 18,
      paddingY: 16,
      align: 'left',
      fill: '#0f172a',
      fontSize: 13
    });

    celebrationOverlay.text = '';
    if (mapSceneCopy.celebrationText) {
      layoutTextCard(graphics, celebrationOverlay, mapSceneCopy.celebrationText, {
        tone: 'dark',
        x: mapSceneLayout.celebrationCard.x,
        y: mapSceneLayout.celebrationCard.y,
        maxWidth: mapSceneLayout.celebrationCard.maxWidth,
        minWidth: mapSceneLayout.celebrationCard.minWidth,
        paddingX: 22,
        paddingY: 18,
        align: 'center',
        fill: '#f8fafc',
        fontSize: 18
      });
      mapSceneLayout.celebrationAccents.forEach((accent) => {
        graphics.circle(accent.x, accent.y, accent.r).fill(accent.color);
      });
    }

    const mapChips = buildMapActionChips(w, state.expeditionComplete);
    mapChips.forEach((chip, index) => {
      drawChip(graphics, chip.x, mapSceneLayout.chipY, chip.w, chip.color, mapSceneLayout.chipHeight);
      const label = chipLabels[index];
      if (label) {
        layoutChipLabel(label, chip.label, chip.x, mapSceneLayout.chipY, chip.w, '#64748b', mapSceneLayout.chipHeight);
      }
    });
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
      tryActivateBeacon();
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
