import { notebookCoreClueSequence } from '../../engine/sim/notebook';
import { CANOPY_LIFT_HOLD_SECONDS } from './canopyLifts';
import type { RuntimeState } from './runtimeState';
import { SERVICE_STOP_HOLD_SECONDS } from './serviceStops';

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
          runBonusNote: 'ruin line: first barrier collapsed and one site objective starts resolved'
        }
      : finalClue === 'nature'
        ? {
            runBonusType: 'lower-beacon' as const,
            runBonusNote: 'grove line: first relay drops into easier reach and one site objective starts charted'
          }
        : {
            runBonusType: 'start-shield' as const,
            runBonusNote: 'anomaly line: shield charge starts primed and one site objective starts stabilized'
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

  let secondaryObjectiveResolved = false;
  const firstServiceStop = state.serviceStops.find((stop) => !stop.serviced);
  if (firstServiceStop) {
    firstServiceStop.serviced = true;
    firstServiceStop.progress = SERVICE_STOP_HOLD_SECONDS;
    secondaryObjectiveResolved = true;
  } else {
    const firstSyncGate = state.syncGates.find((gate) => !gate.stabilized);
    if (firstSyncGate) {
      firstSyncGate.stabilized = true;
      secondaryObjectiveResolved = true;
    } else {
      const firstCanopyLift = state.canopyLifts.find((lift) => !lift.charted);
      if (firstCanopyLift) {
        firstCanopyLift.charted = true;
        firstCanopyLift.progress = CANOPY_LIFT_HOLD_SECONDS;
        secondaryObjectiveResolved = true;
      } else {
        const firstImpactPlate = state.impactPlates.find((plate) => !plate.shattered);
        if (firstImpactPlate) {
          firstImpactPlate.shattered = true;
          secondaryObjectiveResolved = true;
        }
      }
    }
  }

  if (profile.runBonusType === 'clear-hazard') {
    const firstHazard = state.hazards[0];
    if (!firstHazard) {
      return secondaryObjectiveResolved;
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
      return secondaryObjectiveResolved;
    }
    firstRelay.y += 20;
    return true;
  }

  if (profile.runBonusType === 'start-shield') {
    state.shieldChargeAvailable = true;
    return true;
  }

  return secondaryObjectiveResolved;
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
