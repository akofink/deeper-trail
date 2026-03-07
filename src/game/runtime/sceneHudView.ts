import {
  VEHICLE_SUBSYSTEM_KEYS,
  type VehicleCondition,
  type VehicleSubsystemKey,
  type VehicleSubsystems
} from '../state/gameState';

export interface PanelHeaderLayout {
  metaX: number;
  metaY: number;
  seedX: number;
  seedY: number;
  titleX: number;
  titleY: number;
}

export interface ModuleLabelLayout {
  x: number;
  y: number;
}

export interface ModuleMeterView {
  cellHeight: number;
  cellWidth: number;
  conditionColor: string;
  conditionRatio: number;
  gaugeHeight: number;
  gaugeWidth: number;
  levelRatio: number;
  subsystem: VehicleSubsystemKey;
  x: number;
  y: number;
}

const HEADER_INSET_X = 14;
const TITLE_Y = 16;
const META_Y = 34;
const SEED_Y = 46;
const MODULE_COLUMNS = 3;
const MODULE_CELL_WIDTH = 84;
const MODULE_ROW_HEIGHT = 36;
const MODULE_LABEL_INSET_X = 6;
const MODULE_LABEL_INSET_Y = 9;
const MODULE_METER_CELL_WIDTH = 76;
const MODULE_METER_CELL_HEIGHT = 28;
const MODULE_GAUGE_WIDTH = 38;
const MODULE_GAUGE_HEIGHT = 6;

export function buildPanelHeaderLayout(panelX: number, insetX = HEADER_INSET_X): PanelHeaderLayout {
  return {
    metaX: panelX + insetX,
    metaY: META_Y,
    seedX: panelX + insetX,
    seedY: SEED_Y,
    titleX: panelX + insetX,
    titleY: TITLE_Y
  };
}

export function buildModuleLabelLayouts(moduleX: number, moduleY: number, count: number): ModuleLabelLayout[] {
  return Array.from({ length: count }, (_, index) => ({
    x: moduleX + (index % MODULE_COLUMNS) * MODULE_CELL_WIDTH + MODULE_LABEL_INSET_X,
    y: moduleY + Math.floor(index / MODULE_COLUMNS) * MODULE_ROW_HEIGHT + MODULE_LABEL_INSET_Y
  }));
}

export function buildModuleMeterViews(
  moduleX: number,
  moduleY: number,
  vehicle: VehicleSubsystems,
  vehicleCondition: VehicleCondition
): ModuleMeterView[] {
  return VEHICLE_SUBSYSTEM_KEYS.map((subsystem, index) => {
    const condition = vehicleCondition[subsystem];

    return {
      cellHeight: MODULE_METER_CELL_HEIGHT,
      cellWidth: MODULE_METER_CELL_WIDTH,
      conditionColor: condition >= 3 ? '#34d399' : condition === 2 ? '#f59e0b' : '#ef4444',
      conditionRatio: condition / 3,
      gaugeHeight: MODULE_GAUGE_HEIGHT,
      gaugeWidth: MODULE_GAUGE_WIDTH,
      levelRatio: vehicle[subsystem] / 4,
      subsystem,
      x: moduleX + (index % MODULE_COLUMNS) * MODULE_CELL_WIDTH,
      y: moduleY + Math.floor(index / MODULE_COLUMNS) * MODULE_ROW_HEIGHT
    };
  });
}
