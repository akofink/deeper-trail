import type { SceneTextCardSpec } from './sceneTextCards';
import {
  buildSceneTextCardMeasureView,
  buildSceneTextCardView,
  buildSceneTextCardWrappedMeasureView,
  type MeasuredTextSize,
  type SceneTextCardView,
  type SceneTextView
} from './sceneTextView';

export type MeasureText = (view: SceneTextView) => MeasuredTextSize;

export function measureTextViews(views: SceneTextView[], measureText: MeasureText): MeasuredTextSize[] {
  return views.map((view) => measureText(view));
}

export function measureSceneTextCard(card: SceneTextCardSpec, measureText: MeasureText): MeasuredTextSize {
  const measuredWidth = measureText(buildSceneTextCardMeasureView(card)).width;
  return measureText(buildSceneTextCardWrappedMeasureView(card, measuredWidth));
}

export function buildMeasuredSceneTextCardView(card: SceneTextCardSpec, measureText: MeasureText): SceneTextCardView {
  return buildSceneTextCardView(card, measureSceneTextCard(card, measureText));
}
