import type { RuntimeState } from './runtimeState';

export const GOAL_SIGNAL_PRIMER_NOTE = 'Synthesis lock: source approach starts with relay B0 pre-linked.';

export function hasGoalSignalPrimer(state: RuntimeState): boolean {
  return state.sim.notebook.synthesisUnlocked && state.sim.currentNodeId === state.expeditionGoalNodeId;
}

export function applyGoalSignalPrimer(state: RuntimeState): boolean {
  if (!hasGoalSignalPrimer(state)) {
    return false;
  }

  const firstRelay = state.beacons.find((beacon) => !beacon.activated);
  if (!firstRelay) {
    return false;
  }

  firstRelay.activated = true;
  return true;
}

export function goalSignalPrimerNote(selectedNodeId: string | null, state: RuntimeState): string | null {
  if (!selectedNodeId || selectedNodeId !== state.expeditionGoalNodeId || !state.sim.notebook.synthesisUnlocked) {
    return null;
  }

  return GOAL_SIGNAL_PRIMER_NOTE;
}
