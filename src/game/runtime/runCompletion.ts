import type { RuntimeState } from './runtimeState';

export function applyNodeCompletionState(state: RuntimeState): void {
  state.scene = 'map';
  state.mode = state.expeditionComplete ? 'won' : 'playing';
}
