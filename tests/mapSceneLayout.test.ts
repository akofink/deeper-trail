import { describe, expect, it } from 'vitest';
import { buildMapSceneLayout } from '../src/game/runtime/mapSceneLayout';

describe('map scene layout', () => {
  it('keeps both lower cards above the footer chip row', () => {
    const layout = buildMapSceneLayout(1280, 720, 156, 132);

    expect(layout.chipY).toBe(662);
    expect(layout.routeCard.y + 156).toBeLessThanOrEqual(layout.chipY - 14);
    expect(layout.notesCard.y + 132).toBeLessThanOrEqual(layout.chipY - 14);
    expect(layout.routeCard.wrapWidth).toBe(layout.routeCard.maxWidth - 36);
    expect(layout.notesCard.wrapWidth).toBe(layout.notesCard.maxWidth - 36);
  });

  it('clamps card placement on tighter screens instead of dropping below the top safe band', () => {
    const layout = buildMapSceneLayout(900, 540, 340, 320);

    expect(layout.routeCard.maxWidth).toBe(360);
    expect(layout.notesCard.maxWidth).toBe(350);
    expect(layout.routeCard.y).toBe(150);
    expect(layout.notesCard.y).toBe(150);
    expect(layout.celebrationCard.x).toBe(Math.round(900 * 0.5 - 220));
    expect(layout.celebrationAccents).toHaveLength(3);
  });
});
