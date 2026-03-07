import { hasAutoLinkScanner } from '../../engine/sim/vehicle';
import { runObjectivePrompt } from './runObjectiveUi';
import type { RuntimeState } from './runtimeState';

export interface RunSceneOverlayCard {
  fontSize: number;
  maxWidth: number;
  minWidth: number;
  paddingX: number;
  paddingY: number;
  text: string;
  x: number;
  y: number;
}

export interface RunSceneActionChip {
  color: string;
  label: string;
  w: number;
  x: number;
}

const OVERLAY_Y = 150;
const OVERLAY_MAX_WIDTH = 460;
const OVERLAY_SCREEN_MARGIN = 100;
const OVERLAY_MIN_WIDTH = 280;
const WIDE_OVERLAY_PADDING_Y = 18;
const DEFAULT_OVERLAY_PADDING_Y = 14;
const WIDE_OVERLAY_FONT_SIZE = 18;
const DEFAULT_OVERLAY_FONT_SIZE = 20;

export function buildRunSceneOverlayCard(state: RuntimeState, screenWidth: number): RunSceneOverlayCard | null {
  let text = '';

  if (state.mode === 'paused') {
    text = 'Paused\nPress P to resume';
  } else if (state.mode === 'won') {
    text = state.expeditionComplete
      ? 'Signal source reached.\nExpedition complete.'
      : 'Trail complete.\nMap travel unlocked and +1 free trip earned.';
  } else if (state.mode === 'lost') {
    text = 'Trail lost.\nPress Enter or R to restart';
  } else if (state.mapMessageTimer > 0 && state.mapMessage) {
    text = state.mapMessage;
  } else {
    text = runObjectivePrompt(state) ?? '';
  }

  if (!text) {
    return null;
  }

  const emphasizedMode = state.mode === 'won' || state.mode === 'lost' || state.mode === 'paused';
  const maxWidth = Math.min(OVERLAY_MAX_WIDTH, screenWidth - OVERLAY_SCREEN_MARGIN);

  return {
    fontSize: emphasizedMode ? WIDE_OVERLAY_FONT_SIZE : DEFAULT_OVERLAY_FONT_SIZE,
    maxWidth,
    minWidth: OVERLAY_MIN_WIDTH,
    paddingX: 22,
    paddingY: emphasizedMode ? WIDE_OVERLAY_PADDING_Y : DEFAULT_OVERLAY_PADDING_Y,
    text,
    x: Math.round(screenWidth * 0.5 - maxWidth * 0.5),
    y: OVERLAY_Y
  };
}

export function buildRunActionChips(state: RuntimeState): RunSceneActionChip[] {
  return [
    { x: 20, w: 94, color: '#60a5fa', label: 'Arrows\nMove' },
    { x: 122, w: 94, color: '#fbbf24', label: 'Space\nJump' },
    { x: 224, w: 92, color: '#a78bfa', label: 'Shift\nDash' },
    { x: 324, w: 92, color: '#34d399', label: hasAutoLinkScanner(state.sim.vehicle) ? 'Scan\nAuto-link' : 'Enter\nLink' },
    { x: 424, w: 82, color: '#64748b', label: 'A\nMap' }
  ];
}
