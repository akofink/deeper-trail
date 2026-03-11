import { describe, expect, it, vi } from 'vitest';
import type { Graphics, Text } from 'pixi.js';

import { beginSceneFrame, buildSharedSceneTextResetGroups, type SharedSceneTextGroups } from '../src/game/render/sceneFrame';

function createTextNode(text: string): Text {
  return {
    text,
    style: {}
  } as Text;
}

function createSharedGroups(): SharedSceneTextGroups {
  return {
    runLeftRowLabels: [createTextNode('health')],
    runLeftRowValues: [createTextNode('3/3')],
    runRightRowLabels: [createTextNode('links')],
    runRightRowValues: [createTextNode('1/3')],
    mapLeftRowLabels: [createTextNode('trips')],
    mapLeftRowValues: [createTextNode('1')],
    mapRightHeaderLines: [createTextNode('frame')],
    chipLabels: [createTextNode('Enter')],
    beaconLabels: [createTextNode('B1')]
  };
}

describe('sceneFrame helpers', () => {
  it('builds reset groups for every shared scene text collection', () => {
    const groups = createSharedGroups();

    expect(buildSharedSceneTextResetGroups(groups)).toHaveLength(9);
  });

  it('clears both graphics layers and resets shared text labels in one pass', () => {
    const graphics = { clear: vi.fn() } as Pick<Graphics, 'clear'>;
    const playerGraphics = { clear: vi.fn() } as Pick<Graphics, 'clear'>;
    const panelSeed = createTextNode('seed');
    const overlay = createTextNode('overlay');
    const groups = createSharedGroups();

    beginSceneFrame(graphics, playerGraphics, [panelSeed, overlay], groups);

    expect(graphics.clear).toHaveBeenCalledOnce();
    expect(playerGraphics.clear).toHaveBeenCalledOnce();
    expect(panelSeed.text).toBe('');
    expect(overlay.text).toBe('');
    expect(groups.runLeftRowLabels[0]?.text).toBe('');
    expect(groups.mapRightHeaderLines[0]?.text).toBe('');
    expect(groups.chipLabels[0]?.text).toBe('');
    expect(groups.beaconLabels[0]?.text).toBe('');
  });
});
