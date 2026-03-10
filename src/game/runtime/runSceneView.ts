import { hasAutoLinkScanner } from '../../engine/sim/vehicle';
import { currentNodeType } from '../../engine/sim/world';
import { objectiveShortLabel, runObjectiveProgress } from './runObjectiveUi';
import type { RuntimeState } from './runtimeState';

export interface RunSceneOverlayCard {
  align: 'center';
  fontSize: number;
  fill: string;
  maxWidth: number;
  minWidth: number;
  paddingX: number;
  paddingY: number;
  text: string;
  tone: 'dark';
  x: number;
  y: number;
}

export interface RunSceneActionChip {
  color: string;
  height: number;
  label: string;
  labelFill: string;
  w: number;
  x: number;
  y: number;
}

const OVERLAY_Y = 150;
const OVERLAY_MAX_WIDTH = 460;
const OVERLAY_SCREEN_MARGIN = 100;
const OVERLAY_MIN_WIDTH = 280;
const WIDE_OVERLAY_PADDING_Y = 18;
const DEFAULT_OVERLAY_PADDING_Y = 14;
const WIDE_OVERLAY_FONT_SIZE = 18;
const DEFAULT_OVERLAY_FONT_SIZE = 22;

function bannerPulseY(state: RuntimeState): number {
  if (state.mapMessageTimer <= 0 || !state.mapMessage) {
    return OVERLAY_Y;
  }

  const pulse = Math.max(0, Math.sin(state.elapsedSeconds * 12));
  return OVERLAY_Y - Math.round(6 + pulse * 8);
}

export function buildRunSceneOverlayCard(state: RuntimeState, screenWidth: number): RunSceneOverlayCard | null {
  let text = '';
  let fill = '#e2e8f0';

  if (state.mode === 'paused') {
    text = 'Paused\nPress P to resume';
  } else if (state.mode === 'won') {
    text = state.expeditionComplete
      ? 'Signal source reached.\nExpedition complete.'
      : 'Trail complete.\nMap travel unlocked and +1 free trip earned.';
  } else if (state.mode === 'lost') {
    text = 'Trail lost.\nPress Enter or R to restart';
  } else if (state.mapMessageTimer > 0 && state.mapMessage) {
    text = `ALERT\n${state.mapMessage}`;
    fill = '#fef3c7';
  } else {
    const prompt = state.runPromptTimer && state.runPromptTimer > 0 ? state.runPromptText ?? '' : '';
    if (prompt) {
      const progress = runObjectiveProgress(state);
      const nodeType = currentNodeType(state.sim);
      text = `${objectiveShortLabel(nodeType)} ${progress.completed}/${progress.total}\n${prompt}`;
    }
  }

  if (!text) {
    return null;
  }

  const emphasizedMode = state.mode === 'won' || state.mode === 'lost' || state.mode === 'paused';
  const maxWidth = Math.min(OVERLAY_MAX_WIDTH, screenWidth - OVERLAY_SCREEN_MARGIN);

  return {
    align: 'center',
    fontSize: emphasizedMode ? WIDE_OVERLAY_FONT_SIZE : DEFAULT_OVERLAY_FONT_SIZE,
    fill,
    maxWidth,
    minWidth: OVERLAY_MIN_WIDTH,
    paddingX: 22,
    paddingY: emphasizedMode ? WIDE_OVERLAY_PADDING_Y : DEFAULT_OVERLAY_PADDING_Y,
    text,
    tone: 'dark',
    x: Math.round(screenWidth * 0.5 - maxWidth * 0.5),
    y: emphasizedMode ? OVERLAY_Y : bannerPulseY(state)
  };
}

export function buildRunActionChips(state: RuntimeState, screenHeight: number): RunSceneActionChip[] {
  const chipY = screenHeight - 58;
  const height = 34;

  return [
    { x: 20, y: chipY, w: 94, height, color: '#60a5fa', label: 'Arrows\nMove', labelFill: '#dbeafe' },
    { x: 122, y: chipY, w: 94, height, color: '#fbbf24', label: 'Space\nJump', labelFill: '#dbeafe' },
    { x: 224, y: chipY, w: 92, height, color: '#a78bfa', label: 'Shift\nDash', labelFill: '#dbeafe' },
    {
      x: 324,
      y: chipY,
      w: 92,
      height,
      color: '#34d399',
      label: hasAutoLinkScanner(state.sim.vehicle) ? 'Scan\nAuto-link' : 'Enter\nLink',
      labelFill: '#dbeafe'
    },
    { x: 424, y: chipY, w: 82, height, color: '#64748b', label: 'A\nMap', labelFill: '#dbeafe' }
  ];
}
