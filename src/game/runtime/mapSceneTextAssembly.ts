import type { SceneActionChip } from './sceneActionChips';
import type { MapSceneHudViewModel } from './mapSceneHudView';
import {
  buildChipLabelTextViews,
  buildHudRowTextViews,
  buildModuleLabelTextViews,
  buildPanelHeaderTextViews,
  buildStackedHudLabelViews,
  type MeasuredTextSize,
  type PanelHeaderTextViews,
  type SceneTextView
} from './sceneTextView';

export interface MapSceneTextAssembly {
  chipLabels: SceneTextView[];
  header: PanelHeaderTextViews;
  leftRowLabels: SceneTextView[];
  leftRowValues: SceneTextView[];
  moduleLabels: SceneTextView[];
  rightHeaderLines: SceneTextView[];
}

export interface BuildMapSceneTextAssemblyArgs {
  chips: SceneActionChip[];
  hud: MapSceneHudViewModel;
  measureText: (view: SceneTextView) => MeasuredTextSize;
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

function measureStackedLabels(
  lines: string[],
  measureText: (view: SceneTextView) => MeasuredTextSize
): MeasuredTextSize[] {
  return lines.map((line) =>
    measureText({
      fill: '#94a3b8',
      text: line,
      x: 0,
      y: 0
    })
  );
}

export function buildMapSceneTextAssembly({
  chips,
  hud,
  measureText
}: BuildMapSceneTextAssemblyArgs): MapSceneTextAssembly {
  const leftMeasures = measureHudRowLabels(hud.leftRows, measureText);
  const leftValueMeasures = measureHudRowValues(hud.leftRows, measureText);
  const headerMeasures = measureStackedLabels(hud.rightHeaderLines, measureText);

  return {
    chipLabels: buildChipLabelTextViews(chips, measureChipLabels(chips, measureText)),
    header: buildPanelHeaderTextViews(hud.headerLayout, hud),
    leftRowLabels: buildHudRowTextViews(
      hud.leftRows,
      hud.layout.leftLabelX,
      hud.layout.leftValueX,
      leftMeasures,
      leftValueMeasures
    ).labelViews,
    leftRowValues: buildHudRowTextViews(
      hud.leftRows,
      hud.layout.leftLabelX,
      hud.layout.leftValueX,
      leftMeasures,
      leftValueMeasures
    ).valueViews,
    moduleLabels: buildModuleLabelTextViews(hud.moduleLabels),
    rightHeaderLines: buildStackedHudLabelViews(
      hud.rightHeaderLines,
      hud.layout.rightLabelX,
      [hud.layout.rightHeaderLine1Y, hud.layout.rightHeaderLine2Y],
      headerMeasures
    )
  };
}
