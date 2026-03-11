import { describe, expect, it } from 'vitest';
import {
  buildSceneTextCardLayout,
  initialSceneTextCardWrapWidth,
  type SceneTextCardSpec
} from '../src/game/runtime/sceneTextCards';

describe('sceneTextCards', () => {
  const card: SceneTextCardSpec = {
    align: 'center',
    fill: '#e2e8f0',
    fontSize: 18,
    maxWidth: 460,
    minWidth: 280,
    paddingX: 22,
    paddingY: 18,
    text: 'Signal source reached.',
    tone: 'dark',
    x: 300,
    y: 150
  };

  it('uses the card max width and padding to derive the initial wrap width', () => {
    expect(initialSceneTextCardWrapWidth(card)).toBe(416);
  });

  it('clamps card width and centers text from measured dimensions', () => {
    const layout = buildSceneTextCardLayout(card, 180, 48);

    expect(layout.cardWidth).toBe(280);
    expect(layout.cardHeight).toBe(84);
    expect(layout.wordWrapWidth).toBe(236);
    expect(layout.textX).toBe(350);
    expect(layout.textY).toBe(168);
  });

  it('left-aligns text and caps width at the configured max width', () => {
    const layout = buildSceneTextCardLayout(
      {
        ...card,
        align: 'left',
        maxWidth: 320,
        minWidth: 220,
        paddingX: 18
      },
      420,
      60
    );

    expect(layout.cardWidth).toBe(320);
    expect(layout.wordWrapWidth).toBe(284);
    expect(layout.textX).toBe(318);
    expect(layout.textY).toBe(168);
  });
});
