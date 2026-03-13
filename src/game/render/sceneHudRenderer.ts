import type { Graphics, Text } from 'pixi.js';
import type { MapSceneTextCardView } from '../runtime/mapSceneCards';
import type { CelebrationAccent } from '../runtime/mapSceneLayout';
import type { MapSceneHudViewModel } from '../runtime/mapSceneHudView';
import type { MapSceneTextAssembly } from '../runtime/mapSceneTextAssembly';
import type { RunSceneHudViewModel } from '../runtime/runSceneHudView';
import type { RunSceneTextAssembly } from '../runtime/runSceneTextAssembly';
import type { SceneActionChip } from '../runtime/sceneActionChips';
import type { SceneTextCardSpec } from '../runtime/sceneTextCards';
import type { PanelHeaderTextViews, SceneTextView } from '../runtime/sceneTextView';
import { drawChip, drawGauge, drawModuleMeters, drawPanel, drawPips, applyTextCard } from './pixiPrimitives';
import { applyTextView, applyTextViews, clearTextLabel } from './pixiText';

export interface SharedHudLabels {
  hud: Text;
  moduleLabels: Text[];
  panelMeta: Text;
  panelSeed: Text;
}

export interface RunHudLabels extends SharedHudLabels {
  beaconLabels: Text[];
  leftRowLabels: Text[];
  leftRowValues: Text[];
  rightRowLabels: Text[];
  rightRowValues: Text[];
}

export interface MapHudLabels extends SharedHudLabels {
  leftRowLabels: Text[];
  leftRowValues: Text[];
  rightHeaderLines: Text[];
}

function applySharedHeaderText(
  labels: SharedHudLabels,
  header: PanelHeaderTextViews,
  moduleLabelViews: SceneTextView[]
): void {
  applyTextView(labels.hud, header.title);
  applyTextView(labels.panelMeta, header.meta);
  applyTextView(labels.panelSeed, header.seed);
  applyTextViews(labels.moduleLabels, moduleLabelViews);
}

export function drawSceneActionChips(graphics: Graphics, chips: SceneActionChip[]): void {
  chips.forEach((chip) => {
    drawChip(graphics, chip.x, chip.y, chip.w, chip.color, chip.height);
  });
}

export function applyOptionalTextCard(
  graphics: Graphics,
  label: Text,
  card: SceneTextCardSpec | MapSceneTextCardView | null
): void {
  if (card) {
    applyTextCard(graphics, label, card);
    return;
  }

  clearTextLabel(label);
}

export function drawCelebrationAccents(graphics: Graphics, accents: CelebrationAccent[]): void {
  accents.forEach((accent) => {
    graphics.circle(accent.x, accent.y, accent.r).fill(accent.color);
  });
}

export function renderRunSceneHud(
  graphics: Graphics,
  labels: RunHudLabels,
  hud: RunSceneHudViewModel,
  textAssembly: RunSceneTextAssembly
): void {
  const layout = hud.layout;

  drawPanel(graphics, layout.leftPanelX, 10, layout.leftPanelWidth, layout.leftPanelHeight);
  drawPanel(graphics, layout.rightPanelX, 10, layout.rightPanelWidth, layout.rightPanelHeight);
  applyTextViews(labels.beaconLabels, textAssembly.beaconLabels);
  applyTextViews(labels.leftRowLabels, textAssembly.leftRowLabels);
  applyTextViews(labels.leftRowValues, textAssembly.leftRowValues);
  applyTextViews(labels.rightRowLabels, textAssembly.rightRowLabels);
  applyTextViews(labels.rightRowValues, textAssembly.rightRowValues);
  drawPips(
    graphics,
    hud.healthPips.x,
    hud.healthPips.y,
    hud.healthPips.count,
    hud.healthPips.filled,
    hud.healthPips.fillColor,
    hud.healthPips.emptyColor
  );
  drawGauge(
    graphics,
    hud.fuelGauge.x,
    hud.fuelGauge.y,
    hud.fuelGauge.w,
    hud.fuelGauge.h,
    hud.fuelGauge.ratio,
    hud.fuelGauge.fill,
    hud.fuelGauge.track
  );
  drawGauge(
    graphics,
    hud.paceGauge.x,
    hud.paceGauge.y,
    hud.paceGauge.w,
    hud.paceGauge.h,
    hud.paceGauge.ratio,
    hud.paceGauge.fill,
    hud.paceGauge.track
  );
  drawPips(
    graphics,
    hud.objectivePips.x,
    hud.objectivePips.y,
    hud.objectivePips.count,
    hud.objectivePips.filled,
    hud.objectivePips.fillColor,
    hud.objectivePips.emptyColor
  );
  drawGauge(
    graphics,
    hud.boostGauge.x,
    hud.boostGauge.y,
    hud.boostGauge.w,
    hud.boostGauge.h,
    hud.boostGauge.ratio,
    hud.boostGauge.fill,
    hud.boostGauge.track
  );
  drawModuleMeters(graphics, hud.moduleMeters);
  applySharedHeaderText(labels, textAssembly.header, textAssembly.moduleLabels);
}

export function renderMapSceneHud(
  graphics: Graphics,
  labels: MapHudLabels,
  hud: MapSceneHudViewModel,
  textAssembly: MapSceneTextAssembly
): void {
  const layout = hud.layout;

  drawPanel(graphics, layout.leftPanelX, layout.leftPanelY, layout.leftPanelWidth, layout.leftPanelHeight);
  drawPanel(graphics, layout.rightPanelX, layout.rightPanelY, layout.rightPanelWidth, layout.rightPanelHeight);
  applyTextViews(labels.leftRowLabels, textAssembly.leftRowLabels);
  applyTextViews(labels.leftRowValues, textAssembly.leftRowValues);
  applyTextViews(labels.rightHeaderLines, textAssembly.rightHeaderLines);
  drawGauge(graphics, layout.gaugeX, hud.leftRows[1].y - 6, layout.gaugeWidth, 12, hud.fuelRatio, '#38bdf8');
  drawPips(graphics, layout.pipsX, hud.leftRows[0].y - 3, hud.freeTripTotal, hud.freeTripFilled, '#facc15');
  drawModuleMeters(graphics, hud.moduleMeters);
  applySharedHeaderText(labels, textAssembly.header, textAssembly.moduleLabels);
}
