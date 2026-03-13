import type { Container, Text } from 'pixi.js';
import type { SharedSceneTextGroups } from './sceneFrame';

export interface SceneTextNodeInit {
  readonly style: {
    readonly align?: 'left' | 'center' | 'right';
    readonly fill: string;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontWeight: string;
  };
}

export interface SceneTextNodes {
  readonly beaconLabels: Text[];
  readonly celebrationOverlay: Text;
  readonly chipLabels: Text[];
  readonly fieldNotesText: Text;
  readonly hud: Text;
  readonly mapLeftRowLabels: Text[];
  readonly mapLeftRowValues: Text[];
  readonly mapRightHeaderLines: Text[];
  readonly moduleLabels: Text[];
  readonly overlay: Text;
  readonly panelMeta: Text;
  readonly panelSeed: Text;
  readonly runLeftRowLabels: Text[];
  readonly runLeftRowValues: Text[];
  readonly runRightRowLabels: Text[];
  readonly runRightRowValues: Text[];
  readonly sharedSceneTextGroups: SharedSceneTextGroups;
}

export type CreateSceneText = (options: { text: string; style: SceneTextNodeInit['style'] }) => Text;

type SceneTextStage = Pick<Container, 'addChild'>;

function createStageTextNode(stage: SceneTextStage, createText: CreateSceneText, init: SceneTextNodeInit): Text {
  const label = createText({ text: '', style: init.style });
  stage.addChild(label);
  return label;
}

function createStageTextGroup(
  stage: SceneTextStage,
  createText: CreateSceneText,
  count: number,
  init: SceneTextNodeInit
): Text[] {
  return Array.from({ length: count }, () => createStageTextNode(stage, createText, init));
}

export function createSceneTextNodes(stage: SceneTextStage, createText: CreateSceneText): SceneTextNodes {
  const hud = createStageTextNode(stage, createText, {
    style: { fill: '#12263a', fontSize: 20, fontFamily: 'monospace', fontWeight: '700' }
  });
  hud.x = 16;
  hud.y = 12;

  const overlay = createStageTextNode(stage, createText, {
    style: { fill: '#102a43', fontSize: 25, fontFamily: 'monospace', fontWeight: '700', align: 'center' }
  });

  const celebrationOverlay = createStageTextNode(stage, createText, {
    style: { fill: '#f8fafc', fontSize: 18, fontFamily: 'monospace', fontWeight: '700', align: 'center' }
  });

  const chipLabels = createStageTextGroup(stage, createText, 6, {
    style: { fill: '#dbeafe', fontSize: 14, fontFamily: 'monospace', fontWeight: '600' }
  });

  const panelMeta = createStageTextNode(stage, createText, {
    style: { fill: '#cbd5e1', fontSize: 14, fontFamily: 'monospace', fontWeight: '700' }
  });

  const panelSeed = createStageTextNode(stage, createText, {
    style: { fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
  });

  const fieldNotesText = createStageTextNode(stage, createText, {
    style: { fill: '#0f172a', fontSize: 13, fontFamily: 'monospace', fontWeight: '700' }
  });

  const runLeftRowLabels = createStageTextGroup(stage, createText, 3, {
    style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
  });

  const runLeftRowValues = createStageTextGroup(stage, createText, 3, {
    style: { fill: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
  });

  const runRightRowLabels = createStageTextGroup(stage, createText, 3, {
    style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
  });

  const runRightRowValues = createStageTextGroup(stage, createText, 2, {
    style: { fill: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
  });

  const mapLeftRowLabels = createStageTextGroup(stage, createText, 2, {
    style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
  });

  const mapLeftRowValues = createStageTextGroup(stage, createText, 2, {
    style: { fill: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', align: 'right' }
  });

  const mapRightHeaderLines = createStageTextGroup(stage, createText, 2, {
    style: { fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }
  });

  const moduleLabels = createStageTextGroup(stage, createText, 6, {
    style: { fill: '#cbd5e1', fontSize: 10, fontFamily: 'monospace', fontWeight: '700' }
  });

  const beaconLabels = createStageTextGroup(stage, createText, 3, {
    style: { fill: '#111827', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', align: 'center' }
  });

  return {
    beaconLabels,
    celebrationOverlay,
    chipLabels,
    fieldNotesText,
    hud,
    mapLeftRowLabels,
    mapLeftRowValues,
    mapRightHeaderLines,
    moduleLabels,
    overlay,
    panelMeta,
    panelSeed,
    runLeftRowLabels,
    runLeftRowValues,
    runRightRowLabels,
    runRightRowValues,
    sharedSceneTextGroups: {
      runLeftRowLabels,
      runLeftRowValues,
      runRightRowLabels,
      runRightRowValues,
      mapLeftRowLabels,
      mapLeftRowValues,
      mapRightHeaderLines,
      chipLabels,
      beaconLabels
    }
  };
}
