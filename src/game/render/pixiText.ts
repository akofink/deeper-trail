import type { Text } from 'pixi.js';
import type { SceneTextView } from '../runtime/sceneTextView';

export function applyTextView(label: Text, view: SceneTextView): void {
  label.text = view.text;
  if (view.fill) label.style.fill = view.fill;
  if (view.align) label.style.align = view.align;
  if (view.fontSize) label.style.fontSize = view.fontSize;
  if (view.wordWrap !== undefined) label.style.wordWrap = view.wordWrap;
  if (view.wordWrapWidth !== undefined) label.style.wordWrapWidth = view.wordWrapWidth;
  label.x = view.x;
  label.y = view.y;
}

export function measureTextView(label: Text, view: SceneTextView): { height: number; width: number } {
  applyTextView(label, {
    ...view,
    x: label.x,
    y: label.y
  });
  return {
    height: label.height,
    width: label.width
  };
}

export function applyTextViews(labels: Text[], views: SceneTextView[]): void {
  labels.forEach((label, index) => {
    const view = views[index];
    if (!view) {
      label.text = '';
      return;
    }
    applyTextView(label, view);
  });
}

export function clearTextLabels(labels: Text[]): void {
  labels.forEach((label) => {
    label.text = '';
  });
}
