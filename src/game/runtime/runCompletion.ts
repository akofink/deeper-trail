import type { RunObjectiveProgress } from './runObjectiveUi';
import type { RuntimeState } from './runtimeState';

export interface RunCompletionMessageInput {
  expeditionCompleted: boolean;
  expeditionEndingTitle?: string | null;
  expeditionEndingCompletionNote?: string | null;
  flawlessRecovery: number;
  latestNotebookEntryTitle?: string;
}

export function applyNodeCompletionState(state: RuntimeState): void {
  state.scene = 'map';
  state.mode = state.expeditionComplete ? 'won' : 'playing';
}

export function buildExitLockedMessage(progress: RunObjectiveProgress): string {
  const pendingParts: string[] = [];

  if (progress.beaconsRemaining > 0) {
    pendingParts.push(`${progress.beaconsRemaining} relay${progress.beaconsRemaining === 1 ? '' : 's'}`);
  }
  if (progress.serviceStopsRemaining > 0) {
    pendingParts.push(`${progress.serviceStopsRemaining} service ${progress.serviceStopsRemaining === 1 ? 'bay' : 'bays'}`);
  }
  if (progress.syncGatesRemaining > 0) {
    pendingParts.push(`${progress.syncGatesRemaining} sync ${progress.syncGatesRemaining === 1 ? 'gate' : 'gates'}`);
  }
  if (progress.canopyLiftsRemaining > 0) {
    pendingParts.push(`${progress.canopyLiftsRemaining} canopy ${progress.canopyLiftsRemaining === 1 ? 'lift' : 'lifts'}`);
  }
  if (progress.impactPlatesRemaining > 0) {
    pendingParts.push(`${progress.impactPlatesRemaining} impact ${progress.impactPlatesRemaining === 1 ? 'plate' : 'plates'}`);
  }

  return `Exit locked: ${pendingParts.join(', ')} left.`;
}

export function buildRunCompletionMessage(input: RunCompletionMessageInput): string {
  if (input.expeditionCompleted) {
    return input.expeditionEndingTitle
      ? `Signal source reached. ${input.expeditionEndingTitle} decoded. ${input.expeditionEndingCompletionNote ?? ''} Press N for a new expedition.`
          .replace(/\s+/g, ' ')
          .trim()
      : 'Signal source reached. Expedition complete. Press N for a new expedition.';
  }

  let message =
    input.flawlessRecovery > 0
      ? 'Trail complete: route data synced. Clean run restored +1 HP and unlocked +1 free trip.'
      : 'Trail complete: route data synced. +1 free travel charge unlocked.';

  if (input.latestNotebookEntryTitle) {
    message += ` Notebook updated: ${input.latestNotebookEntryTitle}.`;
  }

  return message;
}
