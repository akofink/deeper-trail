import type { SceneActionChip } from './sceneActionChips';
import type { MapSceneHudViewModel } from './mapSceneHudView';
import { measureTextViews } from './sceneTextMeasure';
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

export function buildMapSceneTextAssembly({
  chips,
  hud,
  measureText
}: BuildMapSceneTextAssemblyArgs): MapSceneTextAssembly {
  const leftMeasures = measureTextViews(
    hud.leftRows.map((row) => ({
      fill: '#94a3b8',
      text: row.label,
      x: 0,
      y: row.y
    })),
    measureText
  );
  const leftValueMeasures = measureTextViews(
    hud.leftRows.map((row) => ({
      align: 'right' as const,
      fill: '#e2e8f0',
      text: row.value,
      x: 0,
      y: row.y
    })),
    measureText
  );
  const headerMeasures = measureTextViews(
    hud.rightHeaderLines.map((line) => ({
      fill: '#94a3b8',
      text: line,
      x: 0,
      y: 0
    })),
    measureText
  );

  return {
    chipLabels: buildChipLabelTextViews(
      chips,
      measureTextViews(
        chips.map((chip) => ({
          align: 'center' as const,
          fill: chip.labelFill,
          text: chip.label,
          x: chip.x,
          y: chip.y
        })),
        measureText
      )
    ),
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
