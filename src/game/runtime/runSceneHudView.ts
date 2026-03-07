import { getMaxHealth } from '../../engine/sim/vehicle';
import { runSpeedForState } from './vehicleDerivedStats';
import { buildRunHudLayout, type RunHudLayout } from './runHudLayout';
import { buildRunHudContent } from './sceneHudContent';
import { buildModuleLabelLayouts, buildPanelHeaderLayout, type PanelHeaderLayout } from './sceneHudView';
import { runObjectiveProgress } from './runObjectiveUi';
import type { RuntimeState } from './runtimeState';

export interface RunHudRowView {
  label: string;
  value: string;
  y: number;
}

export interface RunHudModuleLabelView {
  text: string;
  x: number;
  y: number;
}

export interface RunSceneHudViewModel {
  headerLayout: PanelHeaderLayout;
  healthFilled: number;
  healthTotal: number;
  layout: RunHudLayout;
  leftRows: [RunHudRowView, RunHudRowView, RunHudRowView];
  moduleLabels: RunHudModuleLabelView[];
  objectiveCompleted: number;
  objectiveTotal: number;
  paceRatio: number;
  rightRows: [RunHudRowView, RunHudRowView, RunHudRowView];
  seed: string;
  title: string;
  meta: string;
}

export function buildRunSceneHudViewModel(
  state: RuntimeState,
  screenWidth: number,
  moduleLabelCount: number
): RunSceneHudViewModel {
  const content = buildRunHudContent(state);
  const layout = buildRunHudLayout(screenWidth);
  const headerLayout = buildPanelHeaderLayout(layout.leftPanelX);
  const [hpRowY, fuelRowY, paceRowY] = layout.leftRowCenters;
  const [linksRowY, boostRowY, systemsRowY] = layout.rightRowCenters;
  const objectiveProgress = runObjectiveProgress(state);
  const moduleLayouts = buildModuleLabelLayouts(layout.rightPanelX + 14, layout.rightModuleY, moduleLabelCount);

  return {
    headerLayout,
    healthFilled: state.health,
    healthTotal: getMaxHealth(state.sim.vehicle),
    layout,
    leftRows: [
      { label: content.leftRows[0]?.label ?? '', value: content.leftRows[0]?.value ?? '', y: hpRowY },
      { label: content.leftRows[1]?.label ?? '', value: content.leftRows[1]?.value ?? '', y: fuelRowY },
      { label: content.leftRows[2]?.label ?? '', value: content.leftRows[2]?.value ?? '', y: paceRowY }
    ],
    moduleLabels: Array.from({ length: moduleLabelCount }, (_, index) => ({
      text: content.moduleLabels[index] ?? '',
      x: moduleLayouts[index]?.x ?? 0,
      y: moduleLayouts[index]?.y ?? 0
    })),
    objectiveCompleted: objectiveProgress.completed,
    objectiveTotal: objectiveProgress.total,
    paceRatio: Math.min(1, Math.abs(state.player.vx) / Math.max(1, runSpeedForState(state))),
    rightRows: [
      { label: content.rightRows[0]?.label ?? '', value: content.rightRows[0]?.value ?? '', y: linksRowY },
      { label: content.rightRows[1]?.label ?? '', value: content.rightRows[1]?.value ?? '', y: boostRowY },
      { label: content.rightRows[2]?.label ?? '', value: content.rightRows[2]?.value ?? '', y: systemsRowY }
    ],
    seed: content.seed,
    title: content.title,
    meta: content.meta
  };
}
