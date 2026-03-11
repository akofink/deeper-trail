import { getMaxHealth } from '../../engine/sim/vehicle';
import { runSpeedForState } from './vehicleDerivedStats';
import { buildRunHudLayout, type RunHudLayout } from './runHudLayout';
import { buildRunHudContent } from './sceneHudContent';
import {
  buildModuleLabelLayouts,
  buildModuleMeterViews,
  buildPanelHeaderLayout,
  type ModuleMeterView,
  type PanelHeaderLayout
} from './sceneHudView';
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

export interface RunHudGaugeView {
  fill: string;
  h: number;
  ratio: number;
  track?: string;
  w: number;
  x: number;
  y: number;
}

export interface RunHudPipsView {
  count: number;
  emptyColor?: string;
  fillColor: string;
  filled: number;
  x: number;
  y: number;
}

export interface RunSceneHudViewModel {
  boostGauge: RunHudGaugeView;
  fuelGauge: RunHudGaugeView;
  headerLayout: PanelHeaderLayout;
  healthPips: RunHudPipsView;
  healthFilled: number;
  healthTotal: number;
  layout: RunHudLayout;
  leftRows: [RunHudRowView, RunHudRowView, RunHudRowView];
  moduleLabels: RunHudModuleLabelView[];
  moduleMeters: ModuleMeterView[];
  objectivePips: RunHudPipsView;
  objectiveCompleted: number;
  objectiveTotal: number;
  paceGauge: RunHudGaugeView;
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
  const moduleMeters = buildModuleMeterViews(layout.rightPanelX + 14, layout.rightModuleY, state.sim.vehicle, state.sim.vehicleCondition);
  const paceRatio = Math.min(1, Math.abs(state.player.vx) / Math.max(1, runSpeedForState(state)));

  return {
    boostGauge: {
      fill: '#a78bfa',
      h: 12,
      ratio: state.dashEnergy,
      w: layout.rightGaugeWidth,
      x: layout.rightGaugeX,
      y: 69
    },
    fuelGauge: {
      fill: '#38bdf8',
      h: 12,
      ratio: state.sim.fuel / Math.max(1, state.sim.fuelCapacity),
      w: layout.leftGaugeWidth,
      x: layout.leftGaugeX,
      y: fuelRowY - 6
    },
    headerLayout,
    healthPips: {
      count: getMaxHealth(state.sim.vehicle),
      fillColor: '#f97316',
      filled: state.health,
      x: layout.leftPipsX,
      y: hpRowY - 3
    },
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
    moduleMeters,
    objectivePips: {
      count: objectiveProgress.total,
      fillColor: '#22c55e',
      filled: objectiveProgress.completed,
      x: layout.rightPipsX,
      y: linksRowY - 3
    },
    objectiveCompleted: objectiveProgress.completed,
    objectiveTotal: objectiveProgress.total,
    paceGauge: {
      fill: '#f59e0b',
      h: 10,
      ratio: paceRatio,
      w: layout.leftGaugeWidth,
      x: layout.leftGaugeX,
      y: paceRowY - 5
    },
    paceRatio,
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
