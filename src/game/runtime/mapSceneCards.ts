import type { MapSceneLayout } from './mapSceneLayout';
import { buildMapSceneLayout } from './mapSceneLayout';
import type { SceneTextCardSpec } from './sceneTextCards';
import type { MeasuredTextSize } from './sceneTextView';

export interface MapSceneCopyInput {
  celebrationDetail?: string | null;
  expeditionComplete: boolean;
  installHint: string;
  mapMessage: string;
  mapMessageTimer: number;
  repairHint: string;
  routeDetail: string;
  scannerHint: string;
  score: number;
  seed: string;
}

export interface MapSceneCopy {
  celebrationText: string | null;
  routeText: string;
  showRouteCard: boolean;
}

export type MapSceneTextCardView = SceneTextCardSpec;

export interface MapSceneCardViews {
  celebrationCard: MapSceneTextCardView | null;
  notesCard: MapSceneTextCardView;
  routeCard: MapSceneTextCardView | null;
}

export interface MapSceneCardPlan {
  layout: MapSceneLayout;
  views: MapSceneCardViews;
}

export interface MapSceneHudLayout {
  gaugeX: number;
  gaugeWidth: number;
  hudX: number;
  hudY: number;
  leftLabelX: number;
  leftRowCenters: [number, number];
  leftPanelHeight: number;
  leftPanelWidth: number;
  leftPanelX: number;
  leftPanelY: number;
  leftValueX: number;
  metaX: number;
  metaY: number;
  moduleX: number;
  moduleY: number;
  rightHeaderLine1Y: number;
  rightHeaderLine2Y: number;
  pipsX: number;
  rightLabelX: number;
  rightPanelHeight: number;
  rightPanelWidth: number;
  rightPanelX: number;
  rightPanelY: number;
  seedX: number;
  seedY: number;
}

export function buildMapSceneHudLayout(screenWidth: number): MapSceneHudLayout {
  const panelInset = 20;
  const leftPanelWidth = Math.min(344, screenWidth - panelInset * 2);
  const rightPanelWidth = Math.min(316, screenWidth - panelInset * 2);
  const leftPanelX = panelInset;
  const rightPanelX = screenWidth - rightPanelWidth - panelInset;

  return {
    gaugeX: leftPanelX + 84,
    gaugeWidth: leftPanelWidth - 124,
    hudX: leftPanelX + 16,
    hudY: 28,
    leftLabelX: leftPanelX + 16,
    leftRowCenters: [79, 105],
    leftPanelHeight: 142,
    leftPanelWidth,
    leftPanelX,
    leftPanelY: 18,
    leftValueX: leftPanelX + leftPanelWidth - 46,
    metaX: leftPanelX + 16,
    metaY: 48,
    moduleX: rightPanelX + 12,
    moduleY: 88,
    rightHeaderLine1Y: 54,
    rightHeaderLine2Y: 68,
    pipsX: leftPanelX + 84,
    rightLabelX: rightPanelX + 26,
    rightPanelHeight: 162,
    rightPanelWidth,
    rightPanelX,
    rightPanelY: 18,
    seedX: leftPanelX + 16,
    seedY: 60
  };
}

export function buildMapSceneCopy(input: MapSceneCopyInput): MapSceneCopy {
  const statusLine =
    input.mapMessageTimer > 0
      ? input.mapMessage
      : input.expeditionComplete
        ? 'Expedition complete. Press N for a new world.'
        : 'Complete this node to travel.';

  return {
    celebrationText: input.expeditionComplete
      ? [
          'SIGNAL SOURCE REACHED',
          input.celebrationDetail ?? 'Expedition complete.',
          `Seed ${input.seed} complete  •  Score ${input.score}`,
          'Press N to launch a new expedition'
        ].join('\n')
      : null,
    routeText: `${input.routeDetail}\n${input.installHint}\n${input.scannerHint}\n${input.repairHint}\n${statusLine}`,
    showRouteCard: !input.expeditionComplete
  };
}

export function buildMapSceneCardViews(input: {
  celebrationText: string | null;
  fieldNotesText: string;
  layout: MapSceneLayout;
  routeText: string;
  showRouteCard: boolean;
}): MapSceneCardViews {
  return {
    celebrationCard: input.celebrationText
      ? {
          align: 'center',
          fill: '#f8fafc',
          fontSize: 18,
          maxWidth: input.layout.celebrationCard.maxWidth,
          minWidth: input.layout.celebrationCard.minWidth,
          paddingX: 22,
          paddingY: 18,
          text: input.celebrationText,
          tone: 'dark',
          x: input.layout.celebrationCard.x,
          y: input.layout.celebrationCard.y
        }
      : null,
    notesCard: {
      align: 'left',
      fill: '#0f172a',
      fontSize: 13,
      maxWidth: input.layout.notesCard.maxWidth,
      minWidth: input.layout.notesCard.minWidth,
      paddingX: 18,
      paddingY: 16,
      text: input.fieldNotesText,
      tone: 'light',
      x: input.layout.notesCard.x,
      y: input.layout.notesCard.y
    },
    routeCard: input.showRouteCard
      ? {
          align: 'left',
          fill: '#e2e8f0',
          fontSize: 15,
          maxWidth: input.layout.routeCard.maxWidth,
          minWidth: input.layout.routeCard.minWidth,
          paddingX: 18,
          paddingY: 16,
          text: input.routeText,
          tone: 'dark',
          x: input.layout.routeCard.x,
          y: input.layout.routeCard.y
        }
      : null
  };
}

export function buildMapSceneMeasureCardSpecs(input: {
  fieldNotesText: string;
  layout: MapSceneLayout;
  routeText: string;
}): { notesCard: SceneTextCardSpec; routeCard: SceneTextCardSpec } {
  return {
    notesCard: {
      align: 'left',
      fill: '#0f172a',
      fontSize: 13,
      maxWidth: input.layout.notesCard.wrapWidth + 36,
      minWidth: 220,
      paddingX: 18,
      paddingY: 16,
      text: input.fieldNotesText,
      tone: 'light',
      x: 0,
      y: 0
    },
    routeCard: {
      align: 'left',
      fill: '#e2e8f0',
      fontSize: 15,
      maxWidth: input.layout.routeCard.wrapWidth + 36,
      minWidth: 220,
      paddingX: 18,
      paddingY: 16,
      text: input.routeText,
      tone: 'dark',
      x: 0,
      y: 0
    }
  };
}

export function buildMapSceneCardPlan(input: {
  celebrationText: string | null;
  fieldNotesText: string;
  measureCard: (card: SceneTextCardSpec) => MeasuredTextSize;
  routeText: string;
  screenHeight: number;
  screenWidth: number;
  showRouteCard: boolean;
}): MapSceneCardPlan {
  const measureLayout = buildMapSceneLayout(input.screenWidth, input.screenHeight, 0, 0);
  const measureCards = buildMapSceneMeasureCardSpecs({
    fieldNotesText: input.fieldNotesText,
    layout: measureLayout,
    routeText: input.routeText
  });
  const routeMeasure = input.measureCard(measureCards.routeCard);
  const notesMeasure = input.measureCard(measureCards.notesCard);
  const layout = buildMapSceneLayout(
    input.screenWidth,
    input.screenHeight,
    routeMeasure.height + 32,
    notesMeasure.height + 32
  );

  return {
    layout,
    views: buildMapSceneCardViews({
      celebrationText: input.celebrationText,
      fieldNotesText: input.fieldNotesText,
      layout,
      routeText: input.routeText,
      showRouteCard: input.showRouteCard
    })
  };
}
