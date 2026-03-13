import type { Graphics } from 'pixi.js';
import type { RunObjectiveVisualState } from './runObjectiveVisuals';

export interface BeaconLabelView {
  fill: string;
  text: string;
  x: number;
  y: number;
}

export function buildBeaconLabelViews(objectiveVisuals: RunObjectiveVisualState, cameraX: number): BeaconLabelView[] {
  return objectiveVisuals.beacons
    .filter((beacon) => !beacon.activated && objectiveVisuals.beaconRule !== 'standard')
    .map((beacon) => ({
      fill: beacon.labelFill,
      text: beacon.labelText,
      x: beacon.x - cameraX,
      y: beacon.y
    }));
}

export function drawRunObjectiveVisuals(
  graphics: Graphics,
  objectiveVisuals: RunObjectiveVisualState,
  groundY: number,
  elapsedSeconds: number,
  cameraX: number
): void {
  for (const stop of objectiveVisuals.serviceStops) {
    const left = stop.x - stop.width * 0.5 - cameraX;
    const bayColor = stop.serviced ? '#14b8a6' : '#0f766e';
    graphics.roundRect(left, groundY - 14, stop.width, 14, 6).fill({ color: bayColor, alpha: stop.serviced ? 0.45 : 0.24 });
    graphics.roundRect(left, groundY - 14, stop.width, 14, 6).stroke({ color: '#ccfbf1', alpha: stop.serviced ? 0.55 : 0.28, width: 1.2 });
    drawGauge(
      graphics,
      left + 8,
      groundY - 28,
      stop.width - 16,
      6,
      stop.progressRatio,
      '#2dd4bf',
      '#0f172a'
    );
    if (!stop.serviced) {
      graphics.roundRect(left + 10, groundY - 10, stop.width - 20, 6, 3).fill({ color: '#99f6e4', alpha: 0.24 });
    }
  }

  for (const plate of objectiveVisuals.impactPlates) {
    const left = plate.x - plate.width * 0.5 - cameraX;
    const top = groundY - 12;
    graphics.roundRect(left, top, plate.width, 12, 4).fill({
      color: plate.shattered ? '#78716c' : '#a16207',
      alpha: plate.shattered ? 0.38 : 0.72
    });
    graphics.roundRect(left, top, plate.width, 12, 4).stroke({
      color: plate.shattered ? '#d6d3d1' : '#fcd34d',
      alpha: plate.shattered ? 0.45 : 0.7,
      width: 1.4
    });
    if (!plate.shattered) {
      graphics
        .moveTo(left + 10, top + 4)
        .lineTo(left + plate.width * 0.4, top + 8)
        .lineTo(left + plate.width * 0.72, top + 3)
        .lineTo(left + plate.width - 12, top + 8)
        .stroke({ color: '#fef3c7', alpha: 0.55, width: 1.1 });
    }
  }

  for (const lift of objectiveVisuals.canopyLifts) {
    const left = lift.x - lift.width * 0.5 - cameraX;
    const top = lift.y - lift.height * 0.5;
    const activeAlpha = lift.charted ? 0.24 : lift.phaseOpen ? 0.26 : 0.12 + Math.sin(elapsedSeconds * 3 + lift.x * 0.01) * 0.02;
    graphics.roundRect(left, top, lift.width, lift.height, 28).fill({ color: '#84cc16', alpha: activeAlpha });
    graphics.roundRect(left, top, lift.width, lift.height, 28).stroke({
      color: lift.charted ? '#bef264' : lift.phaseOpen ? '#d9f99d' : '#4d7c0f',
      alpha: lift.charted ? 0.72 : lift.phaseOpen ? 0.72 : 0.38,
      width: lift.charted ? 2.8 : lift.phaseOpen ? 2.4 : 1.5
    });
    drawGauge(
      graphics,
      left + 12,
      top + 12,
      lift.width - 24,
      6,
      lift.progressRatio,
      '#d9f99d',
      '#365314'
    );
    if (!lift.charted) {
      graphics.circle(lift.x - cameraX, lift.y, lift.pulseRadius).stroke({
        color: lift.phaseOpen ? '#f7fee7' : '#65a30d',
        alpha: lift.phaseOpen ? 0.46 : 0.18,
        width: lift.phaseOpen ? 2.6 : 1.4
      });
    }
  }

  for (const gate of objectiveVisuals.syncGates) {
    graphics.roundRect(gate.x - gate.width * 0.5 - cameraX, gate.y - gate.height * 0.5, gate.width, gate.height, 20).stroke({
      color: gate.stabilized ? '#22d3ee' : gate.phaseOpen ? '#fbbf24' : '#8b5cf6',
      alpha: gate.stabilized ? 0.8 : gate.phaseOpen ? 0.7 : 0.32,
      width: gate.stabilized ? 3 : gate.phaseOpen ? 2.6 : 1.4
    });
    graphics.roundRect(gate.x - gate.width * 0.5 + 8 - cameraX, gate.y - 6, gate.width - 16, 12, 6).fill({
      color: gate.stabilized ? '#67e8f9' : '#312e81',
      alpha: gate.stabilized ? 0.45 : 0.18
    });
  }

  for (let index = 0; index < objectiveVisuals.beacons.length; index += 1) {
    const beacon = objectiveVisuals.beacons[index];
    const ringColor = beacon.activated ? '#22c55e' : beacon.isNextRequired ? '#f59e0b' : '#64748b';
    const coreColor = beacon.activated ? '#bbf7d0' : '#cbd5e1';
    graphics.circle(beacon.x - cameraX, beacon.y, beacon.radius).fill(ringColor);
    graphics.circle(beacon.x - cameraX, beacon.y, beacon.radius - 5).fill(coreColor);
    if (!beacon.activated && objectiveVisuals.beaconRule === 'boosted') {
      graphics.circle(beacon.x - cameraX, beacon.y, beacon.radius + 7 + Math.sin(elapsedSeconds * 5 + index) * 2).stroke({
        color: beacon.anomalyWindowOpen ? '#fbbf24' : '#8b5cf6',
        alpha: beacon.anomalyWindowOpen ? 0.75 : 0.35,
        width: beacon.anomalyWindowOpen ? 3 : 2
      });
      graphics.circle(beacon.x - cameraX, beacon.y, beacon.radius + 12).stroke({
        color: beacon.anomalyFacingAligned ? '#34d399' : '#22d3ee',
        alpha: beacon.anomalyScanLocked ? 0.9 : 0.18 + beacon.anomalyScanProgressRatio * 0.55,
        width: beacon.anomalyScanLocked ? 3.2 : 1 + beacon.anomalyScanProgressRatio * 2.4
      });
    }
    if (!beacon.activated && objectiveVisuals.beaconRule === 'ordered') {
      graphics.circle(beacon.x - cameraX, beacon.y, beacon.radius + 6).stroke({
        color: beacon.isNextRequired ? '#fbbf24' : '#475569',
        alpha: beacon.isNextRequired ? 0.85 : 0.35,
        width: beacon.isNextRequired ? 2.5 : 1.2
      });
    }
    if (!beacon.activated && objectiveVisuals.beaconRule === 'steady') {
      graphics.circle(beacon.x - cameraX, beacon.y, beacon.radius + 6).stroke({
        color: beacon.steadyReady ? '#14b8a6' : '#0f766e',
        alpha: beacon.steadyReady ? 0.85 : 0.32,
        width: beacon.steadyReady ? 2.8 : 1.4
      });
    }
  }
}

export function drawRunExitFlag(graphics: Graphics, goalX: number, groundY: number, cameraX: number, exitReady: boolean): void {
  graphics.rect(goalX - cameraX, groundY - 130, 8, 130).fill('#334e68');
  graphics
    .moveTo(goalX - cameraX + 8, groundY - 130)
    .lineTo(goalX - cameraX + 78, groundY - 110)
    .lineTo(goalX - cameraX + 8, groundY - 90)
    .closePath()
    .fill(exitReady ? '#22c55e' : '#f97316');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
