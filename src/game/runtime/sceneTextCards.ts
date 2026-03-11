export interface SceneTextCardSpec {
  align: 'left' | 'center';
  fill: string;
  fontSize: number;
  maxWidth: number;
  minWidth: number;
  paddingX: number;
  paddingY: number;
  text: string;
  tone: 'dark' | 'light';
  x: number;
  y: number;
}

export interface SceneTextCardLayout {
  cardHeight: number;
  cardWidth: number;
  textX: number;
  textY: number;
  wordWrapWidth: number;
}

const MIN_WORD_WRAP_WIDTH = 120;

export function initialSceneTextCardWrapWidth(card: SceneTextCardSpec): number {
  return Math.max(MIN_WORD_WRAP_WIDTH, card.maxWidth - card.paddingX * 2);
}

export function buildSceneTextCardLayout(
  card: SceneTextCardSpec,
  measuredTextWidth: number,
  measuredTextHeight: number
): SceneTextCardLayout {
  const cardWidth = Math.max(card.minWidth, Math.min(card.maxWidth, measuredTextWidth + card.paddingX * 2));
  const wordWrapWidth = Math.max(MIN_WORD_WRAP_WIDTH, cardWidth - card.paddingX * 2);
  const cardHeight = measuredTextHeight + card.paddingY * 2;
  const textX = card.align === 'center' ? card.x + Math.round((cardWidth - measuredTextWidth) * 0.5) : card.x + card.paddingX;
  const textY = card.y + Math.round((cardHeight - measuredTextHeight) * 0.5);

  return {
    cardHeight,
    cardWidth,
    textX,
    textY,
    wordWrapWidth
  };
}
