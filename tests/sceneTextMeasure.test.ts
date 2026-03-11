import { describe, expect, it } from 'vitest';
import { buildMeasuredSceneTextCardView, measureSceneTextCard, measureTextViews } from '../src/game/runtime/sceneTextMeasure';
import type { SceneTextView } from '../src/game/runtime/sceneTextView';

function measureText(view: SceneTextView): { width: number; height: number } {
  const longestLine = Math.max(...view.text.split('\n').map((line) => line.length), 0);
  const lineCount = Math.max(1, view.text.split('\n').length);
  const wrapWidth = view.wordWrapWidth ?? Number.POSITIVE_INFINITY;
  const measuredWidth = Math.min(longestLine * 8, wrapWidth);
  const wrappedLineCount = wrapWidth === Number.POSITIVE_INFINITY ? lineCount : Math.max(lineCount, Math.ceil((longestLine * 8) / wrapWidth));

  return {
    width: measuredWidth,
    height: wrappedLineCount * 16
  };
}

describe('sceneTextMeasure', () => {
  it('measures batches of text views through the shared callback', () => {
    expect(
      measureTextViews(
        [
          { text: 'alpha', x: 0, y: 0 },
          { align: 'center', text: 'beta\ngamma', x: 10, y: 20 }
        ],
        measureText
      )
    ).toEqual([
      { width: 40, height: 16 },
      { width: 40, height: 32 }
    ]);
  });

  it('re-measures text cards after wrap width is narrowed by the first pass', () => {
    const card = {
      align: 'left',
      fill: '#e2e8f0',
      fontSize: 15,
      maxWidth: 180,
      minWidth: 120,
      paddingX: 18,
      paddingY: 16,
      text: 'This signal note is long enough to wrap',
      tone: 'dark',
      x: 40,
      y: 120
    } as const;

    expect(measureSceneTextCard(card, measureText)).toEqual({
      width: 144,
      height: 48
    });
  });

  it('builds a final card view from the shared measurement path', () => {
    const card = {
      align: 'left',
      fill: '#0f172a',
      fontSize: 13,
      maxWidth: 164,
      minWidth: 120,
      paddingX: 18,
      paddingY: 16,
      text: 'Field notes wrap cleanly here',
      tone: 'light',
      x: 12,
      y: 80
    } as const;

    expect(buildMeasuredSceneTextCardView(card, measureText)).toEqual({
      cardHeight: 64,
      cardWidth: 164,
      text: {
        align: 'left',
        fill: '#0f172a',
        fontSize: 13,
        text: 'Field notes wrap cleanly here',
        wordWrap: true,
        wordWrapWidth: 128,
        x: 30,
        y: 96
      },
      tone: 'light',
      x: 12,
      y: 80
    });
  });
});
