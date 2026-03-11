import type { ModuleLabelLayout, PanelHeaderLayout } from './sceneHudView';
import {
  buildSceneTextCardLayout,
  initialSceneTextCardWrapWidth,
  type SceneTextCardSpec
} from './sceneTextCards';

export interface SceneTextView {
  align?: 'left' | 'center' | 'right';
  fill?: string;
  fontSize?: number;
  text: string;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  x: number;
  y: number;
}

export interface MeasuredTextSize {
  height: number;
  width: number;
}

export interface SceneTextCardView {
  cardHeight: number;
  cardWidth: number;
  text: SceneTextView;
  tone: SceneTextCardSpec['tone'];
  x: number;
  y: number;
}

export interface PanelHeaderTextViews {
  meta: SceneTextView;
  seed: SceneTextView;
  title: SceneTextView;
}

export interface HudRowTextSpec {
  label: string;
  value?: string;
  y: number;
}

export interface ChipLabelSpec {
  color?: string;
  height: number;
  label: string;
  labelFill: string;
  w: number;
  x: number;
  y: number;
}

export function buildChipLabelView(
  text: string,
  measured: MeasuredTextSize,
  x: number,
  y: number,
  width: number,
  fill: string,
  height = 24
): SceneTextView {
  return {
    align: 'center',
    fill,
    text,
    x: x + Math.round((width - measured.width) * 0.5),
    y: y + Math.round((height - measured.height) * 0.5)
  };
}

export function buildHudRowLabelView(
  text: string,
  x: number,
  centerY: number,
  measuredHeight: number,
  fill = '#94a3b8'
): SceneTextView {
  return {
    fill,
    text,
    x,
    y: Math.round(centerY - measuredHeight * 0.5)
  };
}

export function buildHudRowValueView(
  text: string,
  rightX: number,
  centerY: number,
  measured: MeasuredTextSize,
  fill = '#e2e8f0'
): SceneTextView {
  return {
    align: 'right',
    fill,
    text,
    x: Math.round(rightX - measured.width),
    y: Math.round(centerY - measured.height * 0.5)
  };
}

export function buildCenteredTextView(
  text: string,
  centerX: number,
  centerY: number,
  measured: MeasuredTextSize,
  fill: string
): SceneTextView {
  return {
    align: 'center',
    fill,
    text,
    x: Math.round(centerX - measured.width * 0.5),
    y: Math.round(centerY - measured.height * 0.5)
  };
}

export function buildCenteredTextViews(
  labels: Array<{ fill: string; text: string; x: number; y: number }>,
  measures: MeasuredTextSize[]
): SceneTextView[] {
  return labels.map((label, index) =>
    buildCenteredTextView(label.text, label.x, label.y, measures[index] ?? { width: 0, height: 0 }, label.fill)
  );
}

export function buildHudRowTextViews(
  rows: HudRowTextSpec[],
  labelX: number,
  rightX: number,
  labelMeasures: MeasuredTextSize[],
  valueMeasures: MeasuredTextSize[]
): { labelViews: SceneTextView[]; valueViews: SceneTextView[] } {
  return {
    labelViews: rows.map((row, index) => buildHudRowLabelView(row.label, labelX, row.y, labelMeasures[index]?.height ?? 0)),
    valueViews: rows.map((row, index) =>
      buildHudRowValueView(row.value ?? '', rightX, row.y, valueMeasures[index] ?? { width: 0, height: 0 })
    )
  };
}

export function buildStackedHudLabelViews(
  lines: string[],
  x: number,
  centerYs: number[],
  measures: MeasuredTextSize[],
  fill = '#94a3b8'
): SceneTextView[] {
  return lines.map((line, index) => buildHudRowLabelView(line, x, centerYs[index] ?? 0, measures[index]?.height ?? 0, fill));
}

export function buildChipLabelTextViews(chips: ChipLabelSpec[], measures: MeasuredTextSize[]): SceneTextView[] {
  return chips.map((chip, index) =>
    buildChipLabelView(chip.label, measures[index] ?? { width: 0, height: 0 }, chip.x, chip.y, chip.w, chip.labelFill, chip.height)
  );
}

export function buildModuleLabelTextViews(
  moduleLayouts: Array<ModuleLabelLayout | null | undefined>,
  fill = '#cbd5e1'
): SceneTextView[] {
  return moduleLayouts.map((layout) => ({
    fill,
    text: layout?.text ?? '',
    x: layout?.x ?? 0,
    y: layout?.y ?? 0
  }));
}

export function buildPanelHeaderTextViews(
  layout: PanelHeaderLayout,
  copy: { meta: string; seed: string; title: string }
): PanelHeaderTextViews {
  return {
    meta: {
      fill: '#cbd5e1',
      fontSize: 12,
      text: copy.meta,
      x: layout.metaX,
      y: layout.metaY
    },
    seed: {
      fill: '#94a3b8',
      text: copy.seed,
      x: layout.seedX,
      y: layout.seedY
    },
    title: {
      fill: '#e2e8f0',
      fontSize: 18,
      text: copy.title,
      x: layout.titleX,
      y: layout.titleY
    }
  };
}

export function buildSceneTextCardMeasureView(card: SceneTextCardSpec): SceneTextView {
  return {
    align: card.align,
    fill: card.fill,
    fontSize: card.fontSize,
    text: card.text,
    wordWrap: true,
    wordWrapWidth: initialSceneTextCardWrapWidth(card),
    x: 0,
    y: 0
  };
}

export function buildSceneTextCardWrappedMeasureView(card: SceneTextCardSpec, measuredWidth: number): SceneTextView {
  return {
    ...buildSceneTextCardMeasureView(card),
    wordWrapWidth: buildSceneTextCardLayout(card, measuredWidth, 0).wordWrapWidth
  };
}

export function buildSceneTextCardView(card: SceneTextCardSpec, measured: MeasuredTextSize): SceneTextCardView {
  const layout = buildSceneTextCardLayout(card, measured.width, measured.height);

  return {
    cardHeight: layout.cardHeight,
    cardWidth: layout.cardWidth,
    text: {
      align: card.align,
      fill: card.fill,
      fontSize: card.fontSize,
      text: card.text,
      wordWrap: true,
      wordWrapWidth: layout.wordWrapWidth,
      x: layout.textX,
      y: layout.textY
    },
    tone: card.tone,
    x: card.x,
    y: card.y
  };
}
