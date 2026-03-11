import type { Graphics } from 'pixi.js';
import { buildDamageFeedbackView } from '../runtime/damageFeedback';
import { buildRunSceneDepthView } from '../runtime/runSceneDepthView';
import { encounterRiseAt } from '../runtime/runTerrainProfile';
import type { RuntimeState } from '../runtime/runtimeState';
import { runSpeedForState } from '../runtime/vehicleDerivedStats';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

export function drawMapBackdrop(graphics: Graphics, w: number, h: number): void {
  graphics.rect(0, 0, w, h).fill('#edf2f7');
  graphics.circle(w * 0.16, h * 0.22, 130).fill({ color: '#ffffff', alpha: 0.2 });
  graphics.circle(w * 0.78, h * 0.18, 100).fill({ color: '#dbeafe', alpha: 0.18 });
  graphics.roundRect(80, h * 0.28, w - 160, 1, 0).stroke({ color: '#cbd5e1', alpha: 0.4, width: 1 });
  graphics.roundRect(120, h * 0.52, w - 240, 1, 0).stroke({ color: '#cbd5e1', alpha: 0.28, width: 1 });
  graphics.roundRect(160, h * 0.76, w - 320, 1, 0).stroke({ color: '#cbd5e1', alpha: 0.22, width: 1 });
}

export function drawRunBackdropAccents(graphics: Graphics, state: RuntimeState, nodeType: string, w: number, h: number): void {
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

export function drawRunHazard(
  graphics: Graphics,
  hazard: RuntimeState['hazards'][number],
  cam: number,
  color: string
): void {
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

export function drawRunTerrain(
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

export function drawRunDamageFeedback(
  graphics: Graphics,
  screenWidth: number,
  screenHeight: number,
  state: RuntimeState,
  cameraX: number
): void {
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

export function drawVehicleAvatar(graphics: Graphics, state: RuntimeState, cameraX: number): void {
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
