import type { Graphics, Text } from 'pixi.js';
import { resetSceneText, type SceneTextResetGroup } from './pixiText';

export interface SharedSceneTextGroups {
  readonly runLeftRowLabels: Text[];
  readonly runLeftRowValues: Text[];
  readonly runRightRowLabels: Text[];
  readonly runRightRowValues: Text[];
  readonly mapLeftRowLabels: Text[];
  readonly mapLeftRowValues: Text[];
  readonly mapRightHeaderLines: Text[];
  readonly chipLabels: Text[];
  readonly beaconLabels: Text[];
}

export function buildSharedSceneTextResetGroups(groups: SharedSceneTextGroups): SceneTextResetGroup[] {
  return [
    { labels: groups.runLeftRowLabels },
    { labels: groups.runLeftRowValues },
    { labels: groups.runRightRowLabels },
    { labels: groups.runRightRowValues },
    { labels: groups.mapLeftRowLabels },
    { labels: groups.mapLeftRowValues },
    { labels: groups.mapRightHeaderLines },
    { labels: groups.chipLabels },
    { labels: groups.beaconLabels }
  ];
}

export function beginSceneFrame(
  graphics: Pick<Graphics, 'clear'>,
  playerGraphics: Pick<Graphics, 'clear'>,
  singleLabels: Text[],
  sharedTextGroups: SharedSceneTextGroups
): void {
  graphics.clear();
  playerGraphics.clear();
  resetSceneText({
    singleLabels,
    groups: buildSharedSceneTextResetGroups(sharedTextGroups)
  });
}
