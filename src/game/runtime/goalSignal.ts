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
  encounterBonusNote: string;
  arrivalBonusType: 'scrap' | 'health' | 'fuel';
  runBonusType: 'clear-hazard' | 'start-shield' | 'lower-beacon';
  encounterBonusType:
    | 'lower-relays'
    | 'clear-front-hazards'
    | 'extra-salvage'
    | 'soften-movers'
    | 'shorter-run'
    | 'clear-tail-hazard';
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
  const encounterBonus =
    leadClue === 'ruin' && middleClue === 'nature'
      ? {
          encounterBonusType: 'lower-relays' as const,
          encounterBonusNote: 'ruin/grove braid: the source shelves its relay line into grounded reach'
        }
      : leadClue === 'ruin' && middleClue === 'anomaly'
        ? {
            encounterBonusType: 'clear-front-hazards' as const,
            encounterBonusNote: 'ruin/phase braid: the source breaches its entry barricades'
          }
        : leadClue === 'nature' && middleClue === 'ruin'
          ? {
              encounterBonusType: 'extra-salvage' as const,
              encounterBonusNote: 'grove/quarry braid: salvage echoes line the source path'
            }
          : leadClue === 'nature' && middleClue === 'anomaly'
            ? {
                encounterBonusType: 'soften-movers' as const,
                encounterBonusNote: 'grove/phase braid: the source quiets its moving fields'
              }
            : leadClue === 'anomaly' && middleClue === 'ruin'
              ? {
                  encounterBonusType: 'shorter-run' as const,
                  encounterBonusNote: 'phase/quarry braid: the source folds the last approach closer'
                }
              : {
                  encounterBonusType: 'clear-tail-hazard' as const,
                  encounterBonusNote: 'phase/grove braid: the source vents a clean final channel'
                };
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
    encounterBonusNote: encounterBonus.encounterBonusNote,
    arrivalBonusType: arrivalBonus.arrivalBonusType,
    runBonusType: runBonus.runBonusType,
    encounterBonusType: encounterBonus.encounterBonusType
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
    if (!collapseHazard(state.hazards[0])) {
      return secondaryObjectiveResolved;
    }
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

function collapseHazard(hazard: RuntimeState['hazards'][number] | undefined): boolean {
  if (!hazard) {
    return false;
  }

  hazard.w = 0;
  hazard.h = 0;
  hazard.baseW = 0;
  hazard.baseH = 0;
  hazard.amplitudeX = 0;
  hazard.amplitudeY = 0;
  hazard.pulse = 0;
  hazard.speed = 0;
  return true;
}

export function applyGoalSignalEncounterBonus(state: RuntimeState): boolean {
  const profile = goalSignalProfile(state);
  if (!profile) {
    return false;
  }

  if (profile.encounterBonusType === 'lower-relays') {
    let lowered = false;
    for (const [index, beacon] of state.beacons.entries()) {
      if (index === profile.primerBeaconIndex) {
        continue;
      }

      beacon.y += 18;
      lowered = true;
    }
    return lowered;
  }

  if (profile.encounterBonusType === 'clear-front-hazards') {
    const first = collapseHazard(state.hazards[0]);
    const second = collapseHazard(state.hazards[1]);
    return first || second;
  }

  if (profile.encounterBonusType === 'extra-salvage') {
    const spawnTargets = state.beacons.filter((_, index) => index !== profile.primerBeaconIndex).slice(0, 2);
    for (const beacon of spawnTargets) {
      state.collectibles.push({
        x: beacon.x,
        y: beacon.y - 18,
        r: 11,
        collected: false
      });
    }
    return spawnTargets.length > 0;
  }

  if (profile.encounterBonusType === 'soften-movers') {
    let softened = false;
    for (const hazard of state.hazards) {
      if (hazard.kind === 'static') {
        continue;
      }

      hazard.amplitudeX *= 0.6;
      hazard.amplitudeY *= 0.6;
      hazard.pulse *= 0.6;
      hazard.speed *= 0.6;
      softened = true;
    }
    return softened;
  }

  if (profile.encounterBonusType === 'shorter-run') {
    state.goalX = Math.max(2100, state.goalX - 180);
    return true;
  }

  const tailHazard = state.hazards.at(-1);
  const collapsed = collapseHazard(tailHazard);
  const trailingRelay = [...state.beacons]
    .map((beacon, index) => ({ beacon, index }))
    .reverse()
    .find(({ index }) => index !== profile.primerBeaconIndex)?.beacon;
  if (trailingRelay) {
    trailingRelay.y += 12;
  }
  return collapsed || Boolean(trailingRelay);
}

export function goalSignalPrimerNote(selectedNodeId: string | null, state: RuntimeState): string | null {
  if (!selectedNodeId || selectedNodeId !== state.expeditionGoalNodeId) {
    return null;
  }

  const profile = decodedGoalSignalProfile(state);
  if (!profile) {
    return null;
  }

  return `Synthesis route: ${profile.primerBeaconId} pre-linked; ${profile.arrivalBonusNote}; ${profile.encounterBonusNote}; ${profile.runBonusNote}.`;
}
