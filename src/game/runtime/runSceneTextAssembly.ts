import type { SceneActionChip } from './sceneActionChips';
import type { RunSceneHudViewModel } from './runSceneHudView';
import { measureTextViews } from './sceneTextMeasure';
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

export function buildRunSceneTextAssembly({
  beaconLabels,
  chips,
  hud,
  measureText
}: BuildRunSceneTextAssemblyArgs): RunSceneTextAssembly {
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
  const rightMeasures = measureTextViews(
    hud.rightRows.map((row) => ({
      fill: '#94a3b8',
      text: row.label,
      x: 0,
      y: row.y
    })),
    measureText
  );
  const rightValueRows = hud.rightRows.slice(0, 2);
  const rightValueMeasures = measureTextViews(
    rightValueRows.map((row) => ({
      align: 'right' as const,
      fill: '#e2e8f0',
      text: row.value,
      x: 0,
      y: row.y
    })),
    measureText
  );
  const beaconMeasures = measureTextViews(
    beaconLabels.map((label) => ({
      align: 'center' as const,
      fill: label.fill,
      text: label.text,
      x: label.x,
      y: label.y
    })),
    measureText
  );

  return {
    beaconLabels: buildCenteredTextViews(beaconLabels, beaconMeasures),
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
