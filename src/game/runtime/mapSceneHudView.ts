import { buildMapSceneHudLayout, type MapSceneHudLayout } from './mapSceneCards';
import { buildMapHudContent } from './sceneHudContent';
import {
  buildModuleLabelLayouts,
  buildModuleMeterViews,
  buildPanelHeaderLayout,
  type ModuleMeterView,
  type PanelHeaderLayout
} from './sceneHudView';
import type { RuntimeState } from './runtimeState';

export interface MapHudRowView {
  label: string;
  value: string;
  y: number;
}

export interface MapHudModuleLabelView {
  text: string;
  x: number;
  y: number;
}

export interface MapSceneHudViewModel {
  freeTripFilled: number;
  freeTripTotal: number;
  fuelRatio: number;
  headerLayout: PanelHeaderLayout;
  layout: MapSceneHudLayout;
  leftRows: [MapHudRowView, MapHudRowView];
  moduleLabels: MapHudModuleLabelView[];
  moduleMeters: ModuleMeterView[];
  rightHeaderLines: [string, string];
  seed: string;
  title: string;
  meta: string;
}

export function buildMapSceneHudViewModel(
  state: RuntimeState,
  screenWidth: number,
  completionState: string,
  moduleLabelCount: number
): MapSceneHudViewModel {
  const content = buildMapHudContent(state, completionState);
  const layout = buildMapSceneHudLayout(screenWidth);
  const headerLayout = buildPanelHeaderLayout(layout.leftPanelX, 16);
  const [tripsRowY, fuelRowY] = layout.leftRowCenters;
  const moduleLayouts = buildModuleLabelLayouts(layout.moduleX, layout.moduleY, moduleLabelCount);
  const moduleMeters = buildModuleMeterViews(layout.moduleX, layout.moduleY, state.sim.vehicle, state.sim.vehicleCondition);

  return {
    freeTripFilled: Math.min(3, state.freeTravelCharges),
    freeTripTotal: 3,
    fuelRatio: state.sim.fuel / Math.max(1, state.sim.fuelCapacity),
    headerLayout,
    layout,
    leftRows: [
      { label: content.leftRows[0]?.label ?? '', value: content.leftRows[0]?.value ?? '', y: tripsRowY },
      { label: content.leftRows[1]?.label ?? '', value: content.leftRows[1]?.value ?? '', y: fuelRowY }
    ],
    moduleLabels: Array.from({ length: moduleLabelCount }, (_, index) => ({
      text: content.moduleLabels[index] ?? '',
      x: moduleLayouts[index]?.x ?? 0,
      y: moduleLayouts[index]?.y ?? 0
    })),
    moduleMeters,
    rightHeaderLines: content.rightHeaderLines,
    seed: content.seed,
    title: content.title,
    meta: content.meta
  };
}
