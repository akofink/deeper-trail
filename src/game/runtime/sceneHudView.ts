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

const HEADER_INSET_X = 14;
const TITLE_Y = 16;
const META_Y = 34;
const SEED_Y = 46;
const MODULE_COLUMNS = 3;
const MODULE_CELL_WIDTH = 84;
const MODULE_ROW_HEIGHT = 36;
const MODULE_LABEL_INSET_X = 6;
const MODULE_LABEL_INSET_Y = 9;

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
