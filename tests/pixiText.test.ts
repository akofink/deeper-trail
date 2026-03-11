import { describe, expect, it } from 'vitest';
import type { Text } from 'pixi.js';

import { applyTextViews, clearTextLabel, resetSceneText } from '../src/game/render/pixiText';

function createTextNode(text: string): Text {
  return {
    text,
    style: {}
  } as Text;
}

describe('pixiText helpers', () => {
  it('clears a single text node', () => {
    const label = createTextNode('Seed alpha');

    clearTextLabel(label);

    expect(label.text).toBe('');
  });

  it('clears grouped and standalone scene text labels together', () => {
    const panelSeed = createTextNode('Seed alpha');
    const overlay = createTextNode('Travel ready');
    const chipA = createTextNode('Enter');
    const chipB = createTextNode('Map');
    const beacon = createTextNode('B1');

    resetSceneText({
      singleLabels: [panelSeed, overlay],
      groups: [{ labels: [chipA, chipB] }, { labels: [beacon] }]
    });

    expect(panelSeed.text).toBe('');
    expect(overlay.text).toBe('');
    expect(chipA.text).toBe('');
    expect(chipB.text).toBe('');
    expect(beacon.text).toBe('');
  });

  it('clears extra labels when there are fewer text views than nodes', () => {
    const labels = [createTextNode('A'), createTextNode('B')];

    applyTextViews(labels, [{ text: 'Fuel', x: 10, y: 20 }]);

    expect(labels[0]?.text).toBe('Fuel');
    expect(labels[1]?.text).toBe('');
  });
});
