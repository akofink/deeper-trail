export interface RunHudLayout {
  leftGaugeX: number;
  leftGaugeWidth: number;
  leftRowCenters: [number, number, number];
  leftPanelHeight: number;
  leftPanelWidth: number;
  leftPanelX: number;
  leftPipsX: number;
  rowLabelX: number;
  rowValueX: number;
  rightGaugeX: number;
  rightGaugeWidth: number;
  rightRowCenters: [number, number, number];
  rightModuleY: number;
  rightPanelHeight: number;
  rightPanelWidth: number;
  rightPanelX: number;
  rightPipsX: number;
  rightRowLabelX: number;
  rightRowValueX: number;
}

const PANEL_INSET = 12;
const LEFT_MIN_GAUGE_WIDTH = 96;
const RIGHT_MIN_GAUGE_WIDTH = 86;
const ROW_LABEL_OFFSET = 14;
const VALUE_GAP = 12;
const LABEL_COLUMN_WIDTH = 56;

export function buildRunHudLayout(screenWidth: number): RunHudLayout {
  const safeWidth = Math.max(320, screenWidth);
  const availableWidth = safeWidth - PANEL_INSET * 2;
  const panelGap = Math.max(16, Math.min(availableWidth * 0.08, 48));
  const maxLeftWidth = Math.min(336, availableWidth);
  const maxRightWidth = Math.min(280, availableWidth);
  const stacked = maxLeftWidth + maxRightWidth + panelGap > availableWidth;

  const leftPanelWidth = stacked ? availableWidth : maxLeftWidth;
  const rightPanelWidth = stacked ? availableWidth : maxRightWidth;
  const leftPanelX = PANEL_INSET;
  const rightPanelX = stacked ? PANEL_INSET : safeWidth - rightPanelWidth - PANEL_INSET;
  const leftGaugeX = leftPanelX + LABEL_COLUMN_WIDTH + 22;
  const rightGaugeX = rightPanelX + 52;

  return {
    leftGaugeX,
    leftGaugeWidth: Math.max(LEFT_MIN_GAUGE_WIDTH, leftPanelWidth - 106),
    leftRowCenters: [63, 89, 115],
    leftPanelHeight: 146,
    leftPanelWidth,
    leftPanelX,
    leftPipsX: leftGaugeX + 2,
    rightGaugeX,
    rightGaugeWidth: Math.max(RIGHT_MIN_GAUGE_WIDTH, rightPanelWidth - 84),
    rightModuleY: 108,
    rightPanelHeight: 174,
    rightPanelWidth,
    rightPanelX,
    rightPipsX: rightGaugeX,
    rightRowCenters: [49, 75, 98],
    rightRowLabelX: rightPanelX + ROW_LABEL_OFFSET,
    rightRowValueX: rightPanelX + rightPanelWidth - ROW_LABEL_OFFSET - VALUE_GAP,
    rowLabelX: leftPanelX + ROW_LABEL_OFFSET,
    rowValueX: leftPanelX + leftPanelWidth - ROW_LABEL_OFFSET - VALUE_GAP
  };
}
