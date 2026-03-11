import type { Graphics, Text } from 'pixi.js';
import { buildMeasuredSceneTextCardView, measureSceneTextCard } from '../runtime/sceneTextMeasure';
import type { ModuleMeterView } from '../runtime/sceneHudView';
import type { SceneTextCardSpec } from '../runtime/sceneTextCards';
import { applyTextView, measureTextView } from './pixiText';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function drawPanel(graphics: Graphics, x: number, y: number, w: number, h: number, alpha = 0.88): void {
  graphics.roundRect(x, y, w, h, 18).fill({ color: '#0f172a', alpha });
  graphics.roundRect(x, y, w, h, 18).stroke({ color: '#e2e8f0', alpha: 0.2, width: 1.5 });
}

export function drawGauge(
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

export function drawPips(
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

export function drawChip(graphics: Graphics, x: number, y: number, labelWidth: number, color: string, height = 24): void {
  graphics.roundRect(x, y, labelWidth, height, 12).fill({ color, alpha: 0.14 });
  graphics.roundRect(x, y, labelWidth, height, 12).stroke({ color, alpha: 0.32, width: 1 });
}

export function drawMessageCard(graphics: Graphics, x: number, y: number, w: number, h: number, tone: 'dark' | 'light' = 'dark'): void {
  const color = tone === 'dark' ? '#0f172a' : '#f8fafc';
  const stroke = tone === 'dark' ? '#cbd5e1' : '#94a3b8';
  graphics.roundRect(x, y, w, h, 18).fill({ color, alpha: tone === 'dark' ? 0.88 : 0.94 });
  graphics.roundRect(x, y, w, h, 18).stroke({ color: stroke, alpha: 0.22, width: 1.2 });
}

export function applyTextCard(graphics: Graphics, textNode: Text, card: SceneTextCardSpec): { width: number; height: number } {
  const cardView = buildMeasuredSceneTextCardView(card, (view) => measureTextView(textNode, view));

  drawMessageCard(graphics, cardView.x, cardView.y, cardView.cardWidth, cardView.cardHeight, cardView.tone);

  applyTextView(textNode, cardView.text);
  return { width: cardView.cardWidth, height: cardView.cardHeight };
}

export function measureTextCard(textNode: Text, card: SceneTextCardSpec): { height: number; width: number } {
  return measureSceneTextCard(card, (view) => measureTextView(textNode, view));
}

export function drawModuleMeters(graphics: Graphics, moduleMeters: ModuleMeterView[]): void {
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
