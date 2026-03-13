import { hasAutoLinkScanner } from '../../engine/sim/vehicle';
import { currentNodeType } from '../../engine/sim/world';
import { goalSignalProfile } from './goalSignal';
import { objectiveShortLabel, runObjectiveProgress } from './runObjectiveUi';
import type { RuntimeState } from './runtimeState';
import { buildSceneActionChipRow, type SceneActionChip } from './sceneActionChips';
import type { SceneTextCardSpec } from './sceneTextCards';

export interface RunSceneOverlayCard extends SceneTextCardSpec {
  align: 'center';
  tone: 'dark';
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
    if (state.expeditionComplete) {
      const goalSignal = goalSignalProfile(state);
      text = goalSignal
        ? `Signal source reached.\n${goalSignal.endingTitle}\n${goalSignal.endingEpilogueNote}`
        : 'Signal source reached.\nExpedition complete.';
    } else {
      text = 'Trail complete.\nMap travel unlocked and +1 free trip earned.';
    }
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

export function buildRunActionChips(state: RuntimeState, screenWidth: number, screenHeight: number): SceneActionChip[] {
  const chipY = screenHeight - 58;
  const height = 34;

  return buildSceneActionChipRow(
    screenWidth,
    chipY,
    height,
    [
      { width: 94, minWidth: 76, color: '#60a5fa', label: 'Arrows\nMove', labelFill: '#dbeafe' },
      { width: 94, minWidth: 76, color: '#fbbf24', label: 'Space\nJump', labelFill: '#dbeafe' },
      { width: 92, minWidth: 72, color: '#a78bfa', label: 'Shift\nDash', labelFill: '#dbeafe' },
      {
        width: 92,
        minWidth: 78,
        color: '#34d399',
        label: hasAutoLinkScanner(state.sim.vehicle) ? 'Scan\nAuto-link' : 'Enter\nLink',
        labelFill: '#dbeafe'
      },
      { width: 82, minWidth: 68, color: '#64748b', label: 'A\nMap', labelFill: '#dbeafe' }
    ],
    { align: 'left', gap: 8, leftInset: 20, rightInset: 20, minGap: 5 }
  );
}
