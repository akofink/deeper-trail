import type { SceneActionChip } from './sceneActionChips';
import type { RunSceneHudViewModel } from './runSceneHudView';
import {
  buildCenteredTextViews,
  buildChipLabelTextViews,
  buildHudRowTextViews,
  buildModuleLabelTextViews,
  buildPanelHeaderTextViews,
  type MeasuredTextSize,
  type PanelHeaderTextViews,
  type SceneTextView
} from './sceneTextView';

export interface RunSceneTextAssembly {
  beaconLabels: SceneTextView[];
  chipLabels: SceneTextView[];
  header: PanelHeaderTextViews;
  leftRowLabels: SceneTextView[];
  leftRowValues: SceneTextView[];
  moduleLabels: SceneTextView[];
  rightRowLabels: SceneTextView[];
  rightRowValues: SceneTextView[];
}

export interface BuildRunSceneTextAssemblyArgs {
  beaconLabels: Array<{ fill: string; text: string; x: number; y: number }>;
  chips: SceneActionChip[];
  hud: RunSceneHudViewModel;
  measureText: (view: SceneTextView) => MeasuredTextSize;
}

function measureCenteredText(
  labels: Array<{ fill: string; text: string; x: number; y: number }>,
  measureText: (view: SceneTextView) => MeasuredTextSize
): MeasuredTextSize[] {
  return labels.map((label) =>
    measureText({
      align: 'center',
      fill: label.fill,
      text: label.text,
      x: label.x,
      y: label.y
    })
  );
}

function measureChipLabels(
  chips: SceneActionChip[],
  measureText: (view: SceneTextView) => MeasuredTextSize
): MeasuredTextSize[] {
  return chips.map((chip) =>
    measureText({
      align: 'center',
      fill: chip.labelFill,
      text: chip.label,
      x: chip.x,
      y: chip.y
    })
  );
}

function measureHudRowLabels(
  rows: Array<{ label: string; y: number }>,
  measureText: (view: SceneTextView) => MeasuredTextSize
): MeasuredTextSize[] {
  return rows.map((row) =>
    measureText({
      fill: '#94a3b8',
      text: row.label,
      x: 0,
      y: row.y
    })
  );
}

function measureHudRowValues(
  rows: Array<{ value: string; y: number }>,
  measureText: (view: SceneTextView) => MeasuredTextSize
): MeasuredTextSize[] {
  return rows.map((row) =>
    measureText({
      align: 'right',
      fill: '#e2e8f0',
      text: row.value,
      x: 0,
      y: row.y
    })
  );
}

export function buildRunSceneTextAssembly({
  beaconLabels,
  chips,
  hud,
  measureText
}: BuildRunSceneTextAssemblyArgs): RunSceneTextAssembly {
  const leftMeasures = measureHudRowLabels(hud.leftRows, measureText);
  const leftValueMeasures = measureHudRowValues(hud.leftRows, measureText);
  const rightMeasures = measureHudRowLabels(hud.rightRows, measureText);
  const rightValueRows = hud.rightRows.slice(0, 2);
  const rightValueMeasures = measureHudRowValues(rightValueRows, measureText);
  const beaconMeasures = measureCenteredText(beaconLabels, measureText);

  return {
    beaconLabels: buildCenteredTextViews(beaconLabels, beaconMeasures),
    chipLabels: buildChipLabelTextViews(chips, measureChipLabels(chips, measureText)),
    header: buildPanelHeaderTextViews(hud.headerLayout, hud),
    leftRowLabels: buildHudRowTextViews(
      hud.leftRows,
      hud.layout.rowLabelX,
      hud.layout.rowValueX,
      leftMeasures,
      leftValueMeasures
    ).labelViews,
    leftRowValues: buildHudRowTextViews(
      hud.leftRows,
      hud.layout.rowLabelX,
      hud.layout.rowValueX,
      leftMeasures,
      leftValueMeasures
    ).valueViews,
    moduleLabels: buildModuleLabelTextViews(hud.moduleLabels),
    rightRowLabels: buildHudRowTextViews(
      hud.rightRows,
      hud.layout.rightRowLabelX,
      hud.layout.rightRowValueX,
      rightMeasures,
      []
    ).labelViews,
    rightRowValues: buildHudRowTextViews(
      rightValueRows,
      hud.layout.rightRowLabelX,
      hud.layout.rightRowValueX,
      [],
      rightValueMeasures
    ).valueViews
  };
}
