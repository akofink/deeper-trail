export interface MapTextCardLayout {
  maxWidth: number;
  minWidth: number;
  wrapWidth: number;
  x: number;
  y: number;
}

export interface CelebrationAccent {
  color: string;
  r: number;
  x: number;
  y: number;
}

export interface MapSceneLayout {
  celebrationAccents: CelebrationAccent[];
  celebrationCard: MapTextCardLayout;
  chipHeight: number;
  chipY: number;
  notesCard: MapTextCardLayout;
  routeCard: MapTextCardLayout;
}

export function buildMapSceneLayout(
  screenWidth: number,
  screenHeight: number,
  routeCardHeight: number,
  notesCardHeight: number
): MapSceneLayout {
  const routeMaxWidth = Math.min(360, screenWidth - 80);
  const notesMaxWidth = Math.max(280, Math.min(350, screenWidth - routeMaxWidth - 120));
  const chipY = screenHeight - 58;
  const routeY = Math.max(150, chipY - 14 - routeCardHeight);
  const notesY = Math.max(150, chipY - 14 - notesCardHeight);

  return {
    celebrationAccents: [
      { color: '#fbbf24', r: 10, x: screenWidth * 0.5, y: 138 },
      { color: '#f59e0b', r: 6, x: screenWidth * 0.5 - 118, y: 174 },
      { color: '#22c55e', r: 6, x: screenWidth * 0.5 + 126, y: 182 }
    ],
    celebrationCard: {
      maxWidth: 440,
      minWidth: 360,
      wrapWidth: 396,
      x: Math.round(screenWidth * 0.5 - 220),
      y: 150
    },
    chipHeight: 34,
    chipY,
    notesCard: {
      maxWidth: notesMaxWidth,
      minWidth: 280,
      wrapWidth: Math.max(120, notesMaxWidth - 36),
      x: screenWidth - notesMaxWidth - 20,
      y: notesY
    },
    routeCard: {
      maxWidth: routeMaxWidth,
      minWidth: 330,
      wrapWidth: Math.max(120, routeMaxWidth - 36),
      x: 20,
      y: routeY
    }
  };
}
