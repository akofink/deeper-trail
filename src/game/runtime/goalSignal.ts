import { notebookCoreClueSequence } from '../../engine/sim/notebook';
import type { RuntimeState } from './runtimeState';

const RELAY_INDEX_BY_CLUE = {
  ruin: 0,
  nature: 1,
  anomaly: 2
} as const;

export interface GoalSignalProfile {
  primerBeaconId: string;
  primerBeaconIndex: number;
  arrivalBonusNote: string;
  runBonusNote: string;
  arrivalBonusType: 'scrap' | 'health' | 'fuel';
  runBonusType: 'clear-hazard' | 'start-shield' | 'lower-beacon';
}

export function hasGoalSignalPrimer(state: RuntimeState): boolean {
  return state.sim.notebook.synthesisUnlocked && state.sim.currentNodeId === state.expeditionGoalNodeId;
}

function decodedGoalSignalProfile(state: RuntimeState): GoalSignalProfile | null {
  if (!state.sim.notebook.synthesisUnlocked) {
    return null;
  }

  const clueSequence = notebookCoreClueSequence(state.sim);
  const [leadClue, middleClue, finalClue] = clueSequence;
  if (!leadClue || !middleClue || !finalClue) {
    return null;
  }

  const primerBeaconIndex = RELAY_INDEX_BY_CLUE[leadClue];
  const primerBeaconId = `B${primerBeaconIndex}`;
  const arrivalBonus =
    middleClue === 'ruin'
      ? {
          arrivalBonusType: 'scrap' as const,
          arrivalBonusNote: 'source cache: +2 scrap on arrival'
        }
      : middleClue === 'nature'
        ? {
            arrivalBonusType: 'health' as const,
            arrivalBonusNote: 'shelter bloom: +1 health on arrival'
          }
        : {
            arrivalBonusType: 'fuel' as const,
            arrivalBonusNote: 'phase reserve: +4 fuel on arrival'
          };
  const runBonus =
    finalClue === 'ruin'
      ? {
          runBonusType: 'clear-hazard' as const,
          runBonusNote: 'ruin line: first barrier collapsed'
        }
      : finalClue === 'nature'
        ? {
            runBonusType: 'lower-beacon' as const,
            runBonusNote: 'grove line: first relay drops into easier reach'
          }
        : {
            runBonusType: 'start-shield' as const,
            runBonusNote: 'anomaly line: shield charge starts primed'
          };

  return {
    primerBeaconId,
    primerBeaconIndex,
    arrivalBonusNote: arrivalBonus.arrivalBonusNote,
    runBonusNote: runBonus.runBonusNote,
    arrivalBonusType: arrivalBonus.arrivalBonusType,
    runBonusType: runBonus.runBonusType
  };
}

export function goalSignalProfile(state: RuntimeState): GoalSignalProfile | null {
  if (!hasGoalSignalPrimer(state)) {
    return null;
  }

  return decodedGoalSignalProfile(state);
}

export function applyGoalSignalPrimer(state: RuntimeState): boolean {
  const profile = goalSignalProfile(state);
  if (!profile) {
    return false;
  }

  const relay = state.beacons[profile.primerBeaconIndex];
  if (!relay || relay.activated) {
    return false;
  }

  relay.activated = true;
  return true;
}

export function applyGoalSignalRunBonus(state: RuntimeState): boolean {
  const profile = goalSignalProfile(state);
  if (!profile) {
    return false;
  }

  if (profile.runBonusType === 'clear-hazard') {
    const firstHazard = state.hazards[0];
    if (!firstHazard) {
      return false;
    }
    firstHazard.w = 0;
    firstHazard.h = 0;
    firstHazard.baseW = 0;
    firstHazard.baseH = 0;
    firstHazard.amplitudeX = 0;
    firstHazard.amplitudeY = 0;
    firstHazard.pulse = 0;
    firstHazard.speed = 0;
    return true;
  }

  if (profile.runBonusType === 'lower-beacon') {
    const firstRelay = state.beacons.find((beacon, index) => !beacon.activated && index !== profile.primerBeaconIndex) ?? state.beacons[0];
    if (!firstRelay) {
      return false;
    }
    firstRelay.y += 20;
    return true;
  }

  if (profile.runBonusType === 'start-shield') {
    state.shieldChargeAvailable = true;
    return true;
  }

  return false;
}

export function goalSignalPrimerNote(selectedNodeId: string | null, state: RuntimeState): string | null {
  if (!selectedNodeId || selectedNodeId !== state.expeditionGoalNodeId) {
    return null;
  }

  const profile = decodedGoalSignalProfile(state);
  if (!profile) {
    return null;
  }

  return `Synthesis route: ${profile.primerBeaconId} pre-linked; ${profile.arrivalBonusNote}; ${profile.runBonusNote}.`;
}
