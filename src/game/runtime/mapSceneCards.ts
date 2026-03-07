export interface MapSceneCopyInput {
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
      ? `SIGNAL SOURCE REACHED\nSeed ${input.seed} complete  •  Score ${input.score}\nPress N to launch a new expedition`
      : null,
    routeText: `${input.routeDetail}\n${input.installHint}\n${input.scannerHint}\n${input.repairHint}\n${statusLine}`,
    showRouteCard: !input.expeditionComplete
  };
}
